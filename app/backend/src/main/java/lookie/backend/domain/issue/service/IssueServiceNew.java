package lookie.backend.domain.issue.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.*;
import lookie.backend.domain.issue.mapper.IssueMapper;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import lookie.backend.domain.task.event.TaskItemCompletedEvent;
import lookie.backend.domain.task.event.TaskItemRevertedEvent;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import lookie.backend.domain.location.mapper.LocationMapper;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * IssueServiceNew - 새 FSM 기준 Issue 처리 구현
 * Pseudo Code 3~6장 기준
 * 레거시 IssueService 기능을 통합한 최종 버전
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
    private final LocationMapper locationMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApplicationEventPublisher eventPublisher;

    // ========== 3.1 createIssue ==========

    @Transactional
    public IssueResponse createIssue(Long workerId, CreateIssueRequest request) {
        log.info("[IssueServiceNew] createIssue - workerId={}, taskId={}, itemId={}, type={}",
                workerId, request.getTaskId(), request.getTaskItemId(), request.getIssueType());

        TaskVO task = taskMapper.findByIdForUpdate(request.getTaskId());
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");

        TaskItemVO item = taskItemMapper.findById(request.getTaskItemId());
        if (item == null || (!("PENDING".equals(item.getStatus()) || "IN_PROGRESS".equals(item.getStatus())))) {
            throw new InvalidItemStatusException();
        }

        // 1. TaskItem 상태 변경 및 초기화
        taskItemMapper.updateStatus(request.getTaskItemId(), "ISSUE_PENDING");
        taskItemMapper.setPickedQty(request.getTaskItemId(), 0);

        // 2. Issue 생성
        IssueVO issue = IssueVO.createInitial(workerId, item, request.getIssueType());
        issueMapper.insertIssue(issue);

        // 3. 증빙 이미지 저장 및 AI 초기 결과 생성
        if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
            IssueImageVO image = new IssueImageVO();
            image.setIssueId(issue.getIssueId());
            image.setImageUrl(request.getImageUrl());
            issueMapper.insertIssueImage(image);
        }

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issue.getIssueId());
        judgment.setImageUrl(request.getImageUrl());
        judgment.setAiDecision("UNKNOWN");
        issueMapper.insertAiJudgment(judgment);

        // 4. [Inventory] 파손 임시 차감
        if ("DAMAGED".equals(request.getIssueType())) {
            inventoryService.recordEvent(
                    "PICK_DAMAGED_TEMP",
                    item.getProductId(),
                    item.getLocationId(),
                    -1,
                    "ISSUE",
                    issue.getIssueId(),
                    workerId);
        }

        // 5. [Event] Redis 집계용 이벤트 발행
        eventPublisher.publishEvent(new TaskItemCompletedEvent(
                item.getBatchTaskItemId(),
                item.getBatchTaskId(),
                task.getZoneId(),
                task.getBatchId()));

        log.info("[IssueServiceNew] Issue created - issueId={}", issue.getIssueId());

        // 6. AI 요청 (커밋 후 실행)
        Long issueIdForAi = issue.getIssueId();
        TaskItemVO itemForAi = item;
        String issueTypeForAi = request.getIssueType();

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

        return IssueResponse.from(issue);
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

            // 🔥 관리자 확인이 필수적인 상황인지 판단 (NEED_CHECK 또는 OUT_OF_STOCK)
            boolean isCallMandatory = "NEED_CHECK".equals(issue.getAiDecision())
                    || "OUT_OF_STOCK".equals(issue.getIssueType());

            if (isCallMandatory) {
                // 1. 관리자 연결 시도 여부 체크
                if ("NONE".equals(issue.getWebrtcStatus()) || issue.getWebrtcStatus() == null) {
                    throw new AdminCallRequiredException(); // 연결 시도 필요
                }
                if ("WAITING".equals(issue.getWebrtcStatus())) {
                    throw new AdminCallInProgressException(); // 연결 시도 중 (통과 불가)
                }

                // AI 판독 결과 조회
                AiJudgmentVO judgmentAtGuard = issueMapper.findAiJudgmentByIssueId(issueId);
                boolean hasImage = judgmentAtGuard != null && judgmentAtGuard.getImageUrl() != null
                        && !judgmentAtGuard.getImageUrl().isEmpty();

                // 2. 관리자 연결 실패(MISSED) 또는 거절/정상확인(NORMAL)인 경우
                // Ghost Stock 상황(재고 없음 신고)이라면 무조건 이미지 증빙이 있어야 통과 가능
                if ("OUT_OF_STOCK".equals(issue.getIssueType())) {
                    boolean isAdminRejected = "NORMAL".equals(issue.getAdminDecision());
                    boolean isCallMissed = "MISSED".equals(issue.getWebrtcStatus());

                    if ((isCallMissed || isAdminRejected) && !hasImage) {
                        throw new ApiException(ErrorCode.ISSUE_IMAGE_REQUIRED);
                    }
                }
                // CONNECTED면 관리자와 확인 완료된 것이므로 통과 허용
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

    // ========== 3.3 retakeIssue / reportImage ==========

    @Transactional
    public void retakeIssue(Long workerId, Long issueId, String imageUrl) {
        log.info("[IssueServiceNew] retakeIssue - workerId={}, issueId={}", workerId, issueId);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null || !"OPEN".equals(issue.getStatus())) {
            throw new ApiException(ErrorCode.ISSUE_ALREADY_RESOLVED);
        }
        if (!workerId.equals(issue.getWorkerId())) {
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
        }

        // 이미지 및 판정 리셋
        IssueImageVO image = new IssueImageVO();
        image.setIssueId(issueId);
        image.setImageUrl(imageUrl);
        issueMapper.insertIssueImage(image);

        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        if (judgment == null) {
            judgment = new AiJudgmentVO();
            judgment.setIssueId(issueId);
            issueMapper.insertAiJudgment(judgment);
        }
        judgment.setImageUrl(imageUrl);
        judgment.setAiDecision("UNKNOWN");
        judgment.setConfidence(null);
        issueMapper.updateAiJudgment(judgment);

        // AI 재요청 (커밋 후)
        TaskItemVO item = taskItemMapper.findById(issue.getBatchTaskItemId());
        String issueType = issue.getIssueType();

        Runnable aiTask = () -> requestAiAnalysis(issueId, item, issueType);
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
    }

    @Transactional
    public void reportImage(Long workerId, Long issueId, String imageUrl) {
        log.info("[IssueServiceNew] reportImage - workerId={}, issueId={}", workerId, issueId);

        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null || !"OPEN".equals(issue.getStatus())) {
            throw new ApiException(ErrorCode.ISSUE_ALREADY_RESOLVED);
        }
        if (!workerId.equals(issue.getWorkerId())) {
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
        }

        IssueImageVO image = new IssueImageVO();
        image.setIssueId(issueId);
        image.setImageUrl(imageUrl);
        issueMapper.insertIssueImage(image);

        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        if (judgment != null) {
            judgment.setImageUrl(imageUrl);
            issueMapper.updateAiJudgment(judgment);
        }

        // [WebSocket] 이미지 등록 알림 (상태 계산 결과가 바뀔 수 있으므로 상세 정보 전송)
        IssueDetailResponse detail = getIssueDetail(issueId);
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, detail);
        log.info("[IssueServiceNew] reportImage - WebSocket notification sent. issueId={}", issueId);
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
    public void onAiResult(Long issueId, AiResultRequest request) {
        log.info("[IssueServiceNew] onAiResult - issueId={}, aiDecision={}, reasonCode={}",
                issueId, request.getAiDecision(), request.getReasonCode());

        // 1. 이슈 조회
        IssueVO issue = issueMapper.findByIdForUpdate(issueId);
        if (issue == null) {
            throw new IllegalStateException("Issue not found");
        }

        // 2. AI 판정 결과 정규화 (DB ENUM 규격 준수)
        String decision = request.getAiDecision();
        String rawReason = request.getReasonCode();
        String mappedReason = "UNKNOWN";

        // ENUM에 없는 값(예: banana_defect) 필터링 및 매핑
        if ("MOVE_LOCATION".equals(rawReason))
            mappedReason = "MOVE_LOCATION";
        else if ("STOCK_EXISTS".equals(rawReason))
            mappedReason = "STOCK_EXISTS";
        else if ("WAITING_RETURN".equals(rawReason))
            mappedReason = "WAITING_RETURN";
        else if ("DAMAGED".equals(rawReason) || (rawReason != null && rawReason.contains("defect")))
            mappedReason = "DAMAGED";
        else if ("AUTO_RESOLVED".equals(rawReason))
            mappedReason = "AUTO_RESOLVED";

        issue.setAiDecision(decision);
        issue.setReasonCode(mappedReason);

        // 3. FSM 정책 적용 (우선순위, 관리자 호출 필요성 등)
        applyAiPolicy(issue, decision, mappedReason);

        // 4. [FSM] MOVE_LOCATION 특수 처리: 자동 해결 및 아이템 복구
        if ("MOVE_LOCATION".equals(mappedReason)) {
            issue.setStatus("RESOLVED");
            issue.setResolvedAt(java.time.LocalDateTime.now());

            // 새 지번 정보가 있다면 매핑
            if (request.getNewLocation() != null) {
                // Assuming locationMapper is injected, e.g., via constructor
                // private final LocationMapper locationMapper;
                LocationVO loc = locationMapper.findByCode(request.getNewLocation());
                if (loc != null) {
                    issue.setNewLocationId(loc.getLocationId());
                    log.info("[IssueServiceNew] MOVE_LOCATION - newLocationId mapped: {} -> {}",
                            request.getNewLocation(), loc.getLocationId());
                }
            }

            // 아이템 상태를 다시 PENDING으로 되돌려 다른 지번에서 집품 가능하게 함
            taskItemMapper.updateStatus(issue.getBatchTaskItemId(), "PENDING");
            // 태스크 상태를 지번 스캔으로 되돌림 (INV-1)
            taskMapper.updateActionStatus(issue.getBatchTaskId(), TaskActionStatus.SCAN_LOCATION);

            log.info("[IssueServiceNew] MOVE_LOCATION -> Issue RESOLVED & TaskItem Reverted to PENDING. taskId={}",
                    issue.getBatchTaskId());

            // [Event] Redis 집계 차감 (Reverted)
            TaskVO task = taskMapper.findById(issue.getBatchTaskId());
            if (task != null) {
                eventPublisher.publishEvent(new TaskItemRevertedEvent(
                        issue.getBatchTaskItemId(),
                        issue.getBatchTaskId(),
                        task.getZoneId(),
                        task.getBatchId()));
            }
        }

        issueMapper.updateIssue(issue);

        // 5. 판정 근거 기록 (ai_judgments 테이블 기록)
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        if (judgment == null) {
            judgment = new AiJudgmentVO();
            judgment.setIssueId(issueId);
            issueMapper.insertAiJudgment(judgment);
        }
        judgment.setAiDecision(decision);
        judgment.setConfidence(request.getConfidence() != null ? request.getConfidence().floatValue() : null);
        judgment.setSummary(request.getSummary());
        judgment.setAiResult(request.getAiResult());
        issueMapper.updateAiJudgment(judgment);

        log.info("[IssueServiceNew] AI result applied and synced - issueId={}", issueId);

        // 6. [WebSocket] UI 실시간 업데이트를 위해 상세 정보 전송
        // 프론트엔드 호환성을 위해 AiResultResponse 규격 사용
        AiResultResponse wsResponse = new AiResultResponse();
        wsResponse.setIssueId(issueId);
        wsResponse.setAiResult(decision);
        wsResponse.setReasonCode(mappedReason);
        wsResponse.setStatus(issue.getStatus());
        wsResponse.setUrgency(issue.getUrgency());
        wsResponse.setAdminRequired(issue.getAdminRequired());
        wsResponse.setIssueHandling(issue.getIssueHandling());
        wsResponse.setSummary(request.getSummary());
        wsResponse.setConfidence(request.getConfidence() != null ? request.getConfidence().floatValue() : null);
        wsResponse.setAiDetail(request.getAiResult()); // AI 상세 좌표 JSON 추가
        wsResponse.setResolvedAt(issue.getResolvedAt());

        // 이미지 URL 포함 (재조회 없이 기존 judgment 정보 사용)
        wsResponse.setImageUrl(judgment.getImageUrl());

        // FSM 상태에 기반한 다음 액션 계산 추가
        wsResponse.setIssueNextAction(calculateWorkerNextAction(issue, judgment).name()); // Changed to
        // calculateWorkerNextAction to match
        // existing method
        wsResponse.setAvailableActions(generateAvailableActions(issue));

        messagingTemplate.convertAndSend("/topic/issues/" + issueId, wsResponse);
        log.info("[IssueServiceNew] AI result broadcasted via WebSocket. issueId={}, decision={}", issueId, decision);
    }

    /**
     * AI 결과에 따른 FSM 정책 매핑 (Urgency, AdminRequired 등)
     */
    private void applyAiPolicy(IssueVO issue, String decision, String reasonCode) {
        // 기본값 설정
        issue.setUrgency(3);
        issue.setAdminRequired(true);
        issue.setIssueHandling("NON_BLOCKING");

        if ("PASS".equals(decision)) {
            issue.setUrgency(4); // 신뢰도 높음 -> 낮은 우선순위
        } else if ("NEED_CHECK".equals(decision)) {
            issue.setUrgency(1); // 관리자 확인 필요 -> 높은 우선순위

            // 재고 부족(OOS)의 경우 Ghost Stock만 BLOCKING
            if ("OUT_OF_STOCK".equals(issue.getIssueType())) {
                if ("STOCK_EXISTS".equals(reasonCode)) {
                    issue.setIssueHandling("BLOCKING");
                } else {
                    issue.setIssueHandling("NON_BLOCKING");
                    issue.setAdminRequired(false);
                }
            } else {
                // 파손 등 나머지 NEED_CHECK는 기본 BLOCKING
                issue.setIssueHandling("BLOCKING");
            }
        } else if ("RETAKE".equals(decision)) {
            issue.setUrgency(0); // 관제 대상 제외
            issue.setIssueHandling("BLOCKING");
            issue.setAdminRequired(false);
        }

        // 지번 이동은 특수 정책
        if ("MOVE_LOCATION".equals(reasonCode)) {
            issue.setUrgency(0);
            issue.setAdminRequired(false);
        }
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

                // [Event] Redis 집계 차감 (Reverted)
                eventPublisher.publishEvent(new TaskItemRevertedEvent(
                        item.getBatchTaskItemId(),
                        item.getBatchTaskId(),
                        task.getZoneId(),
                        task.getBatchId()));
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

    // ========== 조회 관련 메서드 ==========

    @Transactional(readOnly = true)
    public IssueDetailResponse getIssueDetail(Long issueId) {
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);

        // FSM 기반 가이드 계산
        IssueNextAction workerNextAction = calculateWorkerNextAction(issue, judgment);
        List<String> availableActions = generateAvailableActions(issue);

        // IssueDetailResponse.from 내부에서 judgment를 사용하여 aiDetail 등을 이미 매핑하고 있으나,
        // 확실히 하기 위해 workerNextAction과 issueNextAction을 명확히 전달
        return IssueDetailResponse.from(issue, judgment,
                workerNextAction != null ? workerNextAction.name() : null,
                workerNextAction != null ? workerNextAction.name() : null,
                null, availableActions);
    }

    @Transactional(readOnly = true)
    public List<MyIssueSummary> getMyIssueList(Long workerId, IssueStatus status) {
        return issueMapper.findMyIssues(workerId, status);
    }

    @Transactional(readOnly = true)
    public AdminIssueListResponse getAdminIssueList(Long adminId, AdminIssueListRequest request) {
        List<AdminIssueSummary> issues = issueMapper.findAdminIssues(adminId, request);
        long totalCount = issueMapper.countAdminIssues(adminId, request);
        return AdminIssueListResponse.of(issues, request.getPage(), request.getSize(), totalCount);
    }

    // ========== 유틸리티 메서드 ==========

    private IssueNextAction calculateWorkerNextAction(IssueVO issue, AiJudgmentVO judgment) {
        String aiDecision = judgment != null ? judgment.getAiDecision() : "UNKNOWN";

        if ("RETAKE".equals(aiDecision)) {
            return IssueNextAction.WAIT_RETAKE;
        }

        // 🔥 관리자 확인 필수 여부 판단 (NEED_CHECK 또는 OUT_OF_STOCK)
        boolean isCallMandatory = "NEED_CHECK".equals(aiDecision) || "OUT_OF_STOCK".equals(issue.getIssueType());

        if (isCallMandatory) {
            // 1. 관리자와 연결 성공(CONNECTED)했으면 즉시 다음 단계 허용
            if ("CONNECTED".equals(issue.getWebrtcStatus())) {
                return IssueNextAction.NEXT_ITEM;
            }

            // 2. 관리자 연결 실패(MISSED) 또는 거절/정상확인(NORMAL)인 경우
            // Ghost Stock 상황(재고 없음 신고)이라면 무조건 이미지 증빙이 있어야 통과 가능
            if ("OUT_OF_STOCK".equals(issue.getIssueType())) {
                boolean isAdminRejected = "NORMAL".equals(issue.getAdminDecision());
                boolean isCallMissed = "MISSED".equals(issue.getWebrtcStatus());
                boolean hasImage = judgment != null && judgment.getImageUrl() != null
                        && !judgment.getImageUrl().isEmpty();

                if ((isCallMissed || isAdminRejected) && !hasImage) {
                    return IssueNextAction.WAIT_REPORT_IMAGE;
                }
            }

            // 3. 아직 연결 시도 전(NONE)이거나 시도 중(WAITING)이면 연결 대기
            if (!"MISSED".equals(issue.getWebrtcStatus())) {
                return IssueNextAction.WAIT_ADMIN;
            }
        }

        // 이미 해결되었거나(DONE) 다음 아이템으로 넘어갈 준비가 된 경우 (단, 위 가드들에 걸리지 않았을 때만)
        TaskItemVO item = taskItemMapper.findById(issue.getBatchTaskItemId());
        if (item != null && ("PENDING".equals(item.getStatus()) || "DONE".equals(item.getStatus()))) {
            return IssueNextAction.NEXT_ITEM;
        }

        if ("RESOLVED".equals(issue.getStatus()) && "MOVE_LOCATION".equals(issue.getReasonCode())) {
            return IssueNextAction.MOVE_LOCATION;
        }

        return IssueNextAction.NEXT_ITEM;
    }

    private List<String> generateAvailableActions(IssueVO issue) {
        List<String> actions = new ArrayList<>();
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issue.getIssueId());
        IssueNextAction nextAction = calculateWorkerNextAction(issue, judgment);

        // 1. 다음 아이템 진행 (NEXT_ITEM)
        if (nextAction == IssueNextAction.NEXT_ITEM) {
            actions.add("NEXT_ITEM");
        }

        // 2. 관리자 연결 (CONNECT_ADMIN)
        if (nextAction == IssueNextAction.WAIT_ADMIN) {
            // 아직 시도 중이 아닐 때만 버튼 노출 (프론트에서 처리할 수도 있지만 백엔드에서도 가이드)
            if ("NONE".equals(issue.getWebrtcStatus()) || issue.getWebrtcStatus() == null) {
                actions.add("CONNECT_ADMIN");
            }
        }

        // 3. 재촬영 (RETAKE)
        if (nextAction == IssueNextAction.WAIT_RETAKE || "RETAKE".equals(issue.getAiDecision())) {
            actions.add("RETAKE");
        }

        return actions;
    }

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
        // [수정] Task 조회하여 현재 위치 정보 획득
        TaskVO task = taskMapper.findById(taskId);
        if (task == null)
            return null;
        return taskItemMapper.findNextItem(taskId, task.getCurrentLocationId());
    }

    private void assertTaskOwnership(TaskVO task, Long workerId) {
        if (task == null) {
            throw new InvalidTaskStatusException();
        }
        if (!workerId.equals(task.getWorkerId())) {
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
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
            // 이미지 조회를 위해 mapper 직접 호출 (이미지 URL이 필요함)
            AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
            return AiAnalysisRequest.create(
                    issueId,
                    item.getProductId(),
                    issueType,
                    judgment != null ? judgment.getImageUrl() : null,
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
