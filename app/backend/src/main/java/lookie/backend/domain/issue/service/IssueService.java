package lookie.backend.domain.issue.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
import lookie.backend.domain.issue.dto.IssueDetailResponse;
import lookie.backend.domain.issue.dto.IssueNextAction;
import lookie.backend.domain.issue.dto.IssueResponse;
import lookie.backend.domain.issue.mapper.IssueMapper;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.service.TaskItemService;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Issue 도메인 비즈니스 로직 처리 서비스
 * - 이슈 생성 (AI 판정 요청 성공 시)
 * - AI 판정 결과 반영 (Webhook 수신 시)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueMapper issueMapper;
    private final TaskItemService taskItemService;
    private final TaskMapper taskMapper;

    /**
     * 이슈 생성
     * - AI 판정 요청 성공 시 호출
     * - Issue, IssueImage, AiJudgment 초기 데이터 생성
     * - TaskItem 상태를 ISSUE로 변경
     */
    @Transactional
    public IssueResponse createIssue(Long workerId, CreateIssueRequest request) {
        log.info("[IssueService] createIssue started. workerId={}, itemId={}",
                workerId, request.getBatchTaskItemId());

        // 1. TaskItem 존재 여부 확인
        TaskItemVO item = taskItemService.getTaskItem(request.getBatchTaskItemId());
        if (item == null) {
            throw new ApiException(ErrorCode.ISSUE_ITEM_NOT_FOUND);
        }

        // 2. 작업자 권한 검증
        TaskVO task = taskMapper.findById(item.getBatchTaskId());
        if (task == null || !workerId.equals(task.getWorkerId())) {
            log.warn("[IssueService] Unauthorized issue creation attempt. workerId={}, taskWorkerId={}",
                    workerId, task != null ? task.getWorkerId() : "null");
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
        }

        // 3. Issue 생성
        IssueVO issue = IssueVO.createInitial(workerId, item, request.getIssueType());

        issueMapper.insertIssue(issue);
        log.info("[IssueService] Issue created. issueId={}", issue.getIssueId());

        // 3. 이슈 증빙 이미지 저장
        IssueImageVO image = new IssueImageVO();
        image.setIssueId(issue.getIssueId());
        image.setImageUrl(request.getImageUrl());
        issueMapper.insertIssueImage(image);

        // 4. AI 판정 초기 데이터 생성 (UNKNOWN 상태)
        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issue.getIssueId());
        judgment.setImageUrl(request.getImageUrl());
        judgment.setAiDecision("UNKNOWN"); // AI 결과 대기 중
        issueMapper.insertAiJudgment(judgment);

        // 5. TaskItem 상태를 ISSUE로 변경
        taskItemService.markAsIssue(item.getBatchTaskItemId());
        log.info("[IssueService] TaskItem marked as ISSUE. itemId={}", item.getBatchTaskItemId());

        // TODO: AI 서버로 이미지 판정 요청 (비동기)

        return IssueResponse.from(issue);
    }

    /**
     * 이슈 상세 조회
     * - Issue 기본 정보 + AI 판정 결과 + 계산 필드 반환
     * - 프론트엔드가 이슈 상태를 확인할 수 있도록 조회 전용 API
     */
    @Transactional(readOnly = true)
    public IssueDetailResponse getIssueDetail(Long issueId) {
        log.info("[IssueService] getIssueDetail started. issueId={}", issueId);

        // 1. Issue 조회
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 2. AI 판정 결과 조회
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);

        // 3. nextAction 계산
        IssueNextAction nextAction = calculateNextAction(issue);

        // 4. availableActions 생성
        List<String> availableActions = generateAvailableActions(issue);

        // 5. DTO 매핑 및 반환
        return IssueDetailResponse.from(issue, judgment, nextAction.name(), availableActions);
    }

    /**
     * AI 판정 결과 반영
     * - AI 서버로부터 판정 결과 수신 시 호출
     * - AI 결과에 따라 Issue 정책 자동 업데이트
     * - PASS 케이스는 자동 해결 처리
     */
    @Transactional
    public AiResultResponse processAiResult(Long issueId, AiResultRequest request) {
        log.info("[IssueService] processAiResult started. issueId={}, aiDecision={}",
                issueId, request.getAiDecision());

        // 1. Issue 존재 확인
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 이미 판정 결과가 존재하면(UNKNOWN이 아니면) 중복 업데이트 방지
        AiJudgmentVO existing = issueMapper.findAiJudgmentByIssueId(issueId);
        if (existing != null && !"UNKNOWN".equals(existing.getAiDecision())) {
            log.warn("[IssueService] AI result already applied. Skip overwrite. issueId={}, existingDecision={}",
                    issueId, existing.getAiDecision());
            return AiResultResponse.from(issue, calculateNextAction(issue));
        }

        // 2. AI 판정 결과 업데이트
        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issueId);
        judgment.setAiDecision(request.getAiDecision());
        judgment.setConfidence(request.getConfidence());
        judgment.setSummary(request.getSummary());
        judgment.setAiResult(request.getAiResult());
        issueMapper.updateAiJudgment(judgment);

        // 3. AI 결과 → Issue 정책 매핑
        applyAiResultPolicy(issue, request.getAiDecision());

        // 4. Issue 업데이트
        issueMapper.updateIssueStatus(issue);
        log.info("[IssueService] Issue updated by AI result. issueId={}, status={}, priority={}",
                issueId, issue.getStatus(), issue.getPriority());

        // 5. nextAction 계산
        IssueNextAction nextAction = calculateNextAction(issue);

        return AiResultResponse.from(issue, nextAction);
    }

    /**
     * AI 판정 결과에 따른 Issue 정책 매핑
     * - issue_type과 ai_decision 조합으로 정책 결정
     * 
     * @param issue      Issue VO (업데이트할 객체)
     * @param aiDecision AI 판정 결과 (PASS, FAIL, NEED_CHECK, UNKNOWN)
     */
    private void applyAiResultPolicy(IssueVO issue, String aiDecision) {
        String issueType = issue.getIssueType();

        // DAMAGED 케이스
        if ("DAMAGED".equals(issueType)) {
            applyDamagedPolicy(issue, aiDecision);
        }
        // OUT_OF_STOCK 케이스
        else if ("OUT_OF_STOCK".equals(issueType)) {
            applyOutOfStockPolicy(issue, aiDecision);
        } else {
            log.warn("[IssueService] Unknown issue_type={}. Applying default policy.", issueType);
            applyDefaultPolicy(issue);
        }
    }

    /**
     * DAMAGED 타입 정책
     */
    private void applyDamagedPolicy(IssueVO issue, String aiDecision) {
        switch (aiDecision) {
            case "PASS":
                // 정상: 자동 해결
                issue.setStatus("RESOLVED");
                issue.setPriority("LOW");
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("AUTO_RESOLVED");
                issue.setResolvedAt(java.time.LocalDateTime.now());
                log.info("[IssueService] DAMAGED + PASS → Auto-resolved. issueId={}", issue.getIssueId());
                break;

            case "NEED_CHECK":
                // 확인 필요: 관리자 검토 필요 (BLOCKING)
                issue.setStatus("OPEN");
                issue.setPriority("HIGH");
                issue.setIssueHandling("BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("UNKNOWN");
                log.info("[IssueService] DAMAGED + NEED_CHECK → Admin required (BLOCKING). issueId={}",
                        issue.getIssueId());
                break;

            case "FAIL":
                // 명확한 파손
                issue.setStatus("OPEN");
                issue.setPriority("MEDIUM");
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("DAMAGED");
                log.info("[IssueService] DAMAGED + FAIL → Damaged confirmed. issueId={}", issue.getIssueId());
                break;

            case "UNKNOWN":
            default:
                applyDefaultPolicy(issue);
                break;
        }
    }

    /**
     * OUT_OF_STOCK 타입 정책
     */
    private void applyOutOfStockPolicy(IssueVO issue, String aiDecision) {
        switch (aiDecision) {
            case "PASS":
                // 지번 이동
                issue.setStatus("RESOLVED");
                issue.setPriority("LOW");
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("MOVE_LOCATION");
                issue.setResolvedAt(java.time.LocalDateTime.now());
                log.info("[IssueService] OUT_OF_STOCK + PASS → Move location. issueId={}", issue.getIssueId());
                break;

            case "NEED_CHECK":
                // 전산상 재고 있음 (BLOCKING)
                issue.setStatus("OPEN");
                issue.setPriority("HIGH");
                issue.setIssueHandling("BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("STOCK_EXISTS");
                log.info("[IssueService] OUT_OF_STOCK + NEED_CHECK → Stock exists (BLOCKING). issueId={}",
                        issue.getIssueId());
                break;

            case "FAIL":
                // 파손 원인 (1단계: DAMAGED 통합)
                issue.setStatus("OPEN");
                issue.setPriority("MEDIUM");
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("DAMAGED");
                log.info("[IssueService] OUT_OF_STOCK + FAIL → Damaged cause. issueId={}", issue.getIssueId());
                break;

            case "UNKNOWN":
            default:
                applyDefaultPolicy(issue);
                break;
        }
    }

    /**
     * 기본 정책 (UNKNOWN 등)
     */
    private void applyDefaultPolicy(IssueVO issue) {
        issue.setStatus("OPEN");
        issue.setPriority("MEDIUM");
        issue.setIssueHandling("NON_BLOCKING");
        issue.setAdminRequired(false);
        issue.setReasonCode("UNKNOWN");
        log.warn("[IssueService] Applying default policy. issueId={}", issue.getIssueId());
    }

    /**
     * Issue 상태 조합으로 nextAction 계산
     * 
     * @param issue Issue VO
     * @return 프론트엔드 권고 행동
     */
    private IssueNextAction calculateNextAction(IssueVO issue) {
        // BLOCKING → WAIT_ADMIN
        if ("BLOCKING".equals(issue.getIssueHandling())) {
            return IssueNextAction.WAIT_ADMIN;
        }

        // RESOLVED + MOVE_LOCATION → MOVE_LOCATION
        if ("RESOLVED".equals(issue.getStatus()) && "MOVE_LOCATION".equals(issue.getReasonCode())) {
            return IssueNextAction.MOVE_LOCATION;
        }

        // RESOLVED + AUTO_RESOLVED → AUTO_RESOLVED
        if ("RESOLVED".equals(issue.getStatus()) && "AUTO_RESOLVED".equals(issue.getReasonCode())) {
            return IssueNextAction.AUTO_RESOLVED;
        }

        // 나머지 → CONTINUE_PICKING
        return IssueNextAction.CONTINUE_PICKING;
    }

    /**
     * 이슈 상태에 따른 가능한 액션 목록 생성
     * UI 힌트용으로만 사용되며 서버 명령이 아님
     * 
     * @param issue Issue VO
     * @return 가능한 액션 목록
     */
    private List<String> generateAvailableActions(IssueVO issue) {
        List<String> actions = new ArrayList<>();

        // adminRequired가 true이면 관리자 연결 가능
        if (Boolean.TRUE.equals(issue.getAdminRequired())) {
            actions.add("CONNECT_ADMIN");
        }

        // 그 외의 경우 빈 배열 반환
        return actions;
    }
}
