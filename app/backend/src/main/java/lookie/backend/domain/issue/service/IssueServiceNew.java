package lookie.backend.domain.issue.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.AdminCallRequiredException;
import lookie.backend.domain.issue.dto.AdminCallInProgressException;
import lookie.backend.domain.issue.mapper.IssueMapper;
import lookie.backend.domain.issue.vo.IssueVO;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.exception.InvalidItemStatusException;
import lookie.backend.domain.task.exception.InvalidTaskStatusException;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.inventory.service.InventoryService;
import lookie.backend.infra.ai.AiAnalysisClient;
import lookie.backend.infra.ai.dto.AiAnalysisRequest;
import lookie.backend.infra.ai.dto.InventoryStateDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

import java.util.Map;

/**
 * IssueServiceNew - 새 FSM 기준 Issue 처리 구현
 * Pseudo Code 3~6장 기준
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IssueServiceNew {

    private final IssueMapper issueMapper;
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final AiAnalysisClient aiAnalysisClient;
    private final InventoryService inventoryService;
    private final SimpMessagingTemplate messagingTemplate;

    // ========== 3.1 createIssue ==========

    @Transactional
    public Long createIssue(Long workerId, Long taskId, Long taskItemId, String issueType) {
        log.info("[IssueServiceNew] createIssue - workerId={}, taskId={}, itemId={}, type={}",
                workerId, taskId, taskItemId, issueType);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");

        TaskItemVO item = taskItemMapper.findById(taskItemId);
        if (item == null || (!("PENDING".equals(item.getStatus()) || "IN_PROGRESS".equals(item.getStatus())))) {
            throw new InvalidItemStatusException();
        }

        taskItemMapper.updateStatus(taskItemId, "ISSUE_PENDING");
        taskItemMapper.setPickedQty(taskItemId, 0);

        IssueVO issue = IssueVO.createInitial(workerId, item, issueType);
        issueMapper.insertIssue(issue);

        log.info("[IssueServiceNew] Issue created - issueId={}", issue.getIssueId());

        // AI 요청은 트랜잭션 커밋 후 처리 (기존 IssueService 패턴 참고)
        Long issueIdForAi = issue.getIssueId();
        TaskItemVO itemForAi = item;
        String issueTypeForAi = issueType;

        Runnable aiTask = () -> {
            try {
                log.info("[IssueServiceNew] Transaction committed. Sending AI request for issueId={}", issueIdForAi);
                requestAiAnalysis(issueIdForAi, itemForAi, issueTypeForAi);
            } catch (Exception e) {
                log.error("[IssueServiceNew] Failed to request AI analysis. issueId={}", issueIdForAi, e);
            }
        };

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    aiTask.run();
                }
            });
        } else {
            aiTask.run();
        }

        return issue.getIssueId();
    }

    // ========== 3.2 workerChooseNextItem (NEED_CHECK 가드 반영) ==========

    @Transactional
    public void workerChooseNextItem(Long workerId, Long taskId, Long issueId) {
        log.info("[IssueServiceNew] workerChooseNextItem - workerId={}, taskId={}, issueId={}",
                workerId, taskId, issueId);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null || !"OPEN".equals(issue.getStatus())) {
            throw new lookie.backend.global.error.ApiException(
                    lookie.backend.global.error.ErrorCode.ISSUE_ALREADY_RESOLVED);
        }

        TaskItemVO item = taskItemMapper.findById(issue.getBatchTaskItemId());
        if (item == null) {
            throw new InvalidItemStatusException();
        }

        // 아이템이 이미 DONE이면 검증 없이 다음으로 보냄 (상태 복구용)
        if (!"DONE".equals(item.getStatus())) {
            if (!"ISSUE_PENDING".equals(item.getStatus())) {
                throw new InvalidItemStatusException();
            }

            // 🔥 NEED_CHECK 정책 (아직 진행 중인 아이템일 때만 체크)
            if ("NEED_CHECK".equals(issue.getAiDecision())) {
                if ("NONE".equals(issue.getWebrtcStatus()) || issue.getWebrtcStatus() == null) {
                    throw new AdminCallRequiredException();
                }
                if ("WAITING".equals(issue.getWebrtcStatus())) {
                    throw new AdminCallInProgressException();
                }
                // MISSED, CONNECTED면 통과
            }
        }

        TaskItemVO nextItem = findNextPickableItem(taskId);

        if (nextItem == null) {
            task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
        } else {
            task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
        }

        taskMapper.updateTask(task);

        log.info("[IssueServiceNew] Worker chose next item - taskId={}", taskId);
    }

    // ========== 4) 관리자 연결 (시도/결과) ==========

    @Transactional
    public void connectAdmin(Long issueId) {
        log.info("[IssueServiceNew] connectAdmin - issueId={}", issueId);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null || !"OPEN".equals(issue.getStatus())) {
            throw new IllegalStateException("Issue not in OPEN status");
        }

        issue.setWebrtcStatus("WAITING");
        issueMapper.updateIssue(issue);

        // [WebSocket] 상태 변경 알림 전송
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, issue);
        log.info("[IssueServiceNew] Admin connection initiated & Synced - issueId={}", issueId);
    }

    @Transactional
    public void onWebrtcConnected(Long issueId) {
        log.info("[IssueServiceNew] onWebrtcConnected - issueId={}", issueId);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null) {
            throw new IllegalStateException("Issue not found");
        }

        issue.setWebrtcStatus("CONNECTED");
        issueMapper.updateIssue(issue);

        // [WebSocket] 상태 변경 알림 전송
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, issue);
        log.info("[IssueServiceNew] WebRTC connected & Synced - issueId={}", issueId);
    }

    @Transactional
    public void onWebrtcMissed(Long issueId) {
        log.info("[IssueServiceNew] onWebrtcMissed - issueId={}", issueId);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null) {
            throw new IllegalStateException("Issue not found");
        }

        issue.setWebrtcStatus("MISSED");
        issueMapper.updateIssue(issue);

        // [WebSocket] 상태 변경 알림 전송
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, issue);
        log.info("[IssueServiceNew] WebRTC missed & Synced - issueId={}", issueId);
    }

    // ========== 5) AI 결과 반영 ==========

    @Transactional
    public void onAiResult(Long issueId, String aiDecision, String reasonCode) {
        log.info("[IssueServiceNew] onAiResult - issueId={}, aiDecision={}, reasonCode={}",
                issueId, aiDecision, reasonCode);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null) {
            throw new IllegalStateException("Issue not found");
        }

        issue.setAiDecision(aiDecision);
        issue.setReasonCode(reasonCode);

        if ("MOVE_LOCATION".equals(reasonCode)) {
            issue.setStatus("RESOLVED");
            // [FSM] 지번 이동 시 태스크 화면도 지번 스캔으로 초기화
            taskMapper.updateActionStatus(issue.getBatchTaskId(), TaskActionStatus.SCAN_LOCATION);
            log.info("[IssueServiceNew] MOVE_LOCATION -> actionStatus reset to SCAN_LOCATION. taskId={}",
                    issue.getBatchTaskId());
        }

        issueMapper.updateIssue(issue);

        log.info("[IssueServiceNew] AI result applied - issueId={}", issueId);

        // [WebSocket] AI 판정 결과를 프론트엔드에 실시간 전송
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, issue);
        log.info("[IssueServiceNew] AI result sent via WebSocket. issueId={}, aiDecision={}", issueId, aiDecision);
    }

    // ========== 6) AdminConfirmService (복구 유일 경로 유지) ==========

    @Transactional
    public void adminConfirm(Long issueId, String decision) {
        log.info("[IssueServiceNew] adminConfirm - issueId={}, decision={}", issueId, decision);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null || !"OPEN".equals(issue.getStatus())) {
            throw new IllegalStateException("Issue not in OPEN status");
        }

        TaskItemVO item = taskItemMapper.findById(issue.getBatchTaskItemId());
        if (item == null) {
            throw new InvalidItemStatusException();
        }

        TaskVO task = taskMapper.findById(item.getBatchTaskId());
        if (task == null) {
            throw new InvalidTaskStatusException();
        }

        issue.setAdminDecision(decision);
        issue.setStatus("RESOLVED");
        issue.setResolvedAt(java.time.LocalDateTime.now());
        issueMapper.updateIssue(issue);

        // [FSM] 관리자 판정에 따른 아이템/재고 처리
        if ("NORMAL".equals(decision)) {
            // 1. 정상 복구 (NORMAL)
            if ("IN_PROGRESS".equals(task.getStatus()) && "ISSUE_PENDING".equals(item.getStatus())) {
                taskItemMapper.updateStatus(item.getBatchTaskItemId(), "PENDING");
                taskItemMapper.setPickedQty(item.getBatchTaskItemId(), 0);

                // [FSM] 이슈 복구 시 전역 상태를 리셋하지 않고, 나중에 해당 아이템 진입 시 지번 스캔 유도
                // taskMapper.updateActionStatus(task.getBatchTaskId(),
                // TaskActionStatus.SCAN_LOCATION);

                // [Inventory] 파손 임시 차감분 복구
                if ("DAMAGED".equals(issue.getIssueType())) {
                    inventoryService.recordEvent(
                            "REVERT_DAMAGED",
                            item.getProductId(),
                            item.getLocationId(),
                            1, // 1개 복구 (Available +1, DamagedTemp -1)
                            "ISSUE",
                            issue.getIssueId(),
                            null);
                }
                log.info("[IssueServiceNew] Item revived to PENDING and Inventory Reverted. itemId={}",
                        item.getBatchTaskItemId());
            } else {
                taskItemMapper.updateStatus(item.getBatchTaskItemId(), "DONE");
                log.info("[IssueServiceNew] Item marked as DONE (Task not in progress) - itemId={}",
                        item.getBatchTaskItemId());
            }
        } else {
            // 2. 파손 확정 (DAMAGED) 또는 기타 처리
            taskItemMapper.updateStatus(item.getBatchTaskItemId(), "DONE");

            if ("DAMAGED".equals(decision) && "DAMAGED".equals(issue.getIssueType())) {
                // [Inventory] 파손 최종 확정 (추가 수량 차감 없음, 상태 마킹용)
                inventoryService.recordEvent(
                        "PICK_DAMAGED_FINAL",
                        item.getProductId(),
                        item.getLocationId(),
                        0,
                        "ISSUE",
                        issue.getIssueId(),
                        null);
            }
            log.info("[IssueServiceNew] Item finalized - itemId={}, decision={}", item.getBatchTaskItemId(), decision);
        }

        log.info("[IssueServiceNew] Admin confirmed and synced - issueId={}, decision={}", issueId, decision);
    }

    // ========== 유틸리티 메서드 ==========

    /**
     * [WebRTC] 화상 연결 전 이슈 상태 검증
     * - Task가 이미 완료(Next Task 진행 중)되었다면 연결 차단
     */
    @Transactional(readOnly = true)
    public void validateIssueForCall(Long issueId) {
        if (issueId == null)
            return;

        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        TaskVO task = taskMapper.findById(issue.getBatchTaskId());
        if (task != null && "DONE".equals(task.getStatus())) {
            throw new ApiException(ErrorCode.ISSUE_TASK_ALREADY_DONE);
        }
    }

    private TaskItemVO findNextPickableItem(Long taskId) {
        return taskItemMapper.findNextItem(taskId);
    }

    private void assertTaskOwnership(TaskVO task, Long workerId) {
        if (task == null) {
            throw new InvalidTaskStatusException();
        }
        if (!workerId.equals(task.getWorkerId())) {
            throw new InvalidTaskStatusException();
        }
    }

    private void assertTaskStatus(TaskVO task, String expectedStatus) {
        if (!expectedStatus.equals(task.getStatus())) {
            throw new InvalidTaskStatusException();
        }
    }

    // ========== AI 요청 관련 메서드 (기존 IssueService 참고) ==========

    /**
     * AI 분석 요청 (트랜잭션 없음 - 커밋 후 실행됨)
     */
    private void requestAiAnalysis(Long issueId, TaskItemVO item, String issueType) {
        AiAnalysisRequest aiRequest = buildAiAnalysisRequest(issueId, item, issueType);
        aiAnalysisClient.requestAnalysis(aiRequest);
        log.info("[IssueServiceNew] AI request sent. issueId={}, issueType={}", issueId, issueType);
    }

    /**
     * 이슈 타입에 따라 적절한 AI 분석 요청 생성 (기존 IssueService.buildAiAnalysisRequest 참고)
     */
    private AiAnalysisRequest buildAiAnalysisRequest(Long issueId, TaskItemVO item, String issueType) {
        // DAMAGED 케이스: 이미지 없이 전달 (FSM에서는 이슈 생성 시 이미지 없음)
        if ("DAMAGED".equals(issueType)) {
            return AiAnalysisRequest.create(
                    issueId,
                    item.getProductId(),
                    issueType,
                    null, // FSM: 이미지는 나중에 별도 업로드
                    null);
        }

        // OUT_OF_STOCK 케이스: 재고 상태 조회 및 전달
        if ("OUT_OF_STOCK".equals(issueType)) {
            // 재고 상태 조회
            Map<String, Object> inventoryState = inventoryService.getInventoryState(
                    item.getProductId(),
                    item.getLocationId());

            // InventoryStateDto 생성
            InventoryStateDto inventoryStateDto = InventoryStateDto.builder()
                    .availableQty((Integer) inventoryState.get("availableQty"))
                    .damagedTempQty((Integer) inventoryState.get("damagedTempQty"))
                    .scannedLocation(item.getLocationCode())
                    .expectedLocation(item.getLocationCode())
                    .lastEventType((String) inventoryState.get("lastEventType"))
                    .build();

            log.info("[IssueServiceNew] OUT_OF_STOCK detected. inventoryState={}", inventoryStateDto);

            return AiAnalysisRequest.create(
                    issueId,
                    item.getProductId(),
                    issueType,
                    null, // OUT_OF_STOCK은 이미지 없음
                    inventoryStateDto);
        }

        // 기타 타입은 기본 처리 (DAMAGED 방식)
        log.warn("[IssueServiceNew] Unknown issue type: {}. Using DAMAGED default.", issueType);
        return AiAnalysisRequest.create(
                issueId,
                item.getProductId(),
                issueType,
                null,
                null);
    }
}
