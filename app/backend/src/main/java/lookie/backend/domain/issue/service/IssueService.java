package lookie.backend.domain.issue.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.infra.ai.AiAnalysisClient;
import lookie.backend.infra.ai.dto.AiAnalysisRequest;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
import lookie.backend.domain.issue.dto.IssueDetailResponse;
import lookie.backend.domain.issue.dto.IssueNextAction;
import lookie.backend.domain.issue.dto.WorkerNextAction;
import lookie.backend.domain.issue.dto.AdminNextAction;
import lookie.backend.domain.issue.dto.AdminIssueListRequest;

import lookie.backend.domain.issue.dto.AdminIssueListResponse;
import lookie.backend.domain.issue.dto.AdminIssueSummary;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lookie.backend.domain.issue.dto.AdminDecision;

import lookie.backend.domain.issue.dto.IssueStatus;
import lookie.backend.domain.issue.dto.MyIssueSummary;

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
    private final AiAnalysisClient aiAnalysisClient;
    private final SimpMessagingTemplate messagingTemplate;

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

        // 3. 이슈 증빙 이미지 저장 (이미지가 있는 경우에만)
        if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
            IssueImageVO image = new IssueImageVO();
            image.setIssueId(issue.getIssueId());
            image.setImageUrl(request.getImageUrl());
            issueMapper.insertIssueImage(image);
        }

        // 4. AI 판정 초기 데이터 생성 (UNKNOWN 상태)
        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issue.getIssueId());
        judgment.setImageUrl(request.getImageUrl());
        judgment.setAiDecision("UNKNOWN"); // AI 결과 대기 중
        issueMapper.insertAiJudgment(judgment);

        // 5. TaskItem 상태를 ISSUE로 변경
        taskItemService.markAsIssue(item.getBatchTaskItemId());
        log.info("[IssueService] TaskItem marked as ISSUE. itemId={}", item.getBatchTaskItemId());

        // 6. AI 서버로 이미지 판정 요청 (비동기)
        AiAnalysisRequest aiRequest = AiAnalysisRequest.of(
                issue.getIssueId(),
                item.getProductId(),
                request.getImageUrl());
        aiAnalysisClient.requestAnalysis(aiRequest);

        return IssueResponse.from(issue);
    }

    /**
     * AI 재분석 요청 (재촬영)
     * - AI 판정이 RETAKE인 경우, 새 이미지로 다시 분석 요청
     * - 기존 Issue는 유지하고, AI 판정 상태만 초기화 (UNKNOWN)
     */
    @Transactional
    public void retakeIssue(Long workerId, Long issueId, String imageUrl) {
        log.info("[IssueService] retakeIssue started. workerId={}, issueId={}", workerId, issueId);

        // 1. Issue 조회
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 2. 권한 검증 (본인 이슈인지)
        if (!workerId.equals(issue.getWorkerId())) {
            // NOTE: 관리자 개입 등으로 workerId가 달라질 수 있으나,
            // 기본적으로는 본인이 생성한 이슈만 재촬영 가능하도록 제한
            log.warn("[IssueService] Unauthorized retake attempt. workerId={}, issueWorkerId={}",
                    workerId, issue.getWorkerId());
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
        }

        // 3. 현재 AI 판정 상태 확인 (RETAKE 여부)
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        // NOTE: 기획상 RETAKE 상태일 때만 재촬영이 가능하다고 했으므로 검증 추가
        // 하지만 현장 상황에 따라 FAIL 등에서도 재촬영이 필요할 수 있으니,
        // 일단은 "AI 판정이 존재할 때" 덮어쓰기 허용으로 유연하게 가되, 주로 RETAKE에서 사용됨.
        if (judgment == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND); // AI 판정 자체가 없는 경우는 비정상
        }

        log.info("[IssueService] Retaking issue. Original decision={}", judgment.getAiDecision());

        // 4. 새 이미지 이력 저장
        IssueImageVO image = new IssueImageVO();
        image.setIssueId(issueId);
        image.setImageUrl(imageUrl);
        issueMapper.insertIssueImage(image);
        log.info("[IssueService] New image saved for retake.", imageUrl);

        // 5. AI 판정 상태 리셋 (UNKNOWN) & 이미지 URL 교체
        // 기존 레코드를 업데이트하여 processAiResult의 중복 방지 로직(UNKNOWN 체크)을 통과하도록 함
        judgment.setImageUrl(imageUrl);
        judgment.setAiDecision("UNKNOWN");
        judgment.setConfidence(null);
        judgment.setAiResult(null); // 이전 결과 날림
        judgment.setSummary(null);

        issueMapper.updateAiJudgment(judgment);
        log.info("[IssueService] AiJudgment reset to UNKNOWN for retake.");

        // 6. TaskItemVO 조회를 통한 ProductId 획득 (AI 재요청용)
        TaskItemVO item = taskItemService.getTaskItem(issue.getBatchTaskItemId());

        // 7. AI 서버로 재분석 요청 (비동기)
        AiAnalysisRequest aiRequest = AiAnalysisRequest.of(
                issueId,
                item != null ? item.getProductId() : 0L, // 안전장치
                imageUrl);
        aiAnalysisClient.requestAnalysis(aiRequest);
        log.info("[IssueService] Re-analysis requested.");
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

        // 3. nextAction 계산 (분기표 기준)
        WorkerNextAction workerNextAction = calculateWorkerNextAction(issue, judgment);
        IssueNextAction issueNextAction = calculateIssueNextAction(issue, judgment);
        AdminNextAction adminNextAction = calculateAdminNextAction(issue, judgment);

        // 4. availableActions 생성
        List<String> availableActions = generateAvailableActions(issue);

        // 5. DTO 매핑 및 반환
        return IssueDetailResponse.from(
                issue,
                judgment,
                workerNextAction != null ? workerNextAction.name() : null,
                issueNextAction != null ? issueNextAction.name() : null,
                adminNextAction != null ? adminNextAction.name() : null,
                availableActions);
    }

    /**
     * AI 판정 결과 반영
     * - AI 서버로부터 판정 결과 수신 시 호출
     * - AI 결과에 따라 Issue 정책 자동 업데이트
     * - reasonCode와 newLocation 정보 처리
     */
    @Transactional
    public AiResultResponse processAiResult(Long issueId, AiResultRequest request) {
        log.info("[IssueService] processAiResult started. issueId={}, aiDecision={}, reasonCode={}",
                issueId, request.getAiDecision(), request.getReasonCode());

        // 0. Confidence == 0.0 처리 (신뢰 불가 → NEED_CHECK 강제)
        String decision = request.getAiDecision();
        if (request.getConfidence() != null && request.getConfidence() == 0.0f) {
            decision = "NEED_CHECK";
            request.setAiDecision(decision); // DB 업데이트를 위해 request 객체 수정
            log.warn("[IssueService] Confidence is 0.0. Forced decision to NEED_CHECK. issueId={}", issueId);
        }

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
            return AiResultResponse.from(issue, calculateNextAction(issue),
                    existing.getAiDecision(), existing.getSummary(),
                    existing.getConfidence(), existing.getAiResult());
        }

        // 2. AI 판정 결과 업데이트
        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issueId);
        judgment.setAiDecision(request.getAiDecision());
        judgment.setConfidence(request.getConfidence());
        judgment.setSummary(request.getSummary());
        judgment.setAiResult(request.getAiResult());
        issueMapper.updateAiJudgment(judgment);

        // 3. newLocation 처리 (MOVE_LOCATION 케이스)
        if ("MOVE_LOCATION".equals(request.getReasonCode()) && request.getNewLocation() != null) {
            issue.setNewLocationId(request.getNewLocation().getZoneLocationId());
            log.info("[IssueService] newLocation set. issueId={}, newLocationId={}",
                    issueId, issue.getNewLocationId());
        }

        // 4. AI 결과 → Issue 정책 매핑
        applyAiResultPolicy(issue, request.getAiDecision(), request.getReasonCode());

        // 5. Issue 업데이트
        issueMapper.updateIssueStatus(issue);
        log.info("[IssueService] Issue updated by AI result. issueId={}, status={}, reasonCode={}",
                issueId, issue.getStatus(), issue.getReasonCode());

        // 6. nextAction 계산
        IssueNextAction nextAction = calculateNextAction(issue);

        AiResultResponse response = AiResultResponse.from(issue, nextAction,
                judgment.getAiDecision(), judgment.getSummary(),
                judgment.getConfidence(), judgment.getAiResult());

        // [WebSocket] AI 판정 결과 통보
        messagingTemplate.convertAndSend("/topic/issues/" + issueId, response);
        log.info("[IssueService] AI result signaled via WebSocket. issueId={}", issueId);

        return response;
    }

    /**
     * AI 판정 결과에 따른 Issue 정책 매핑
     * - issue_type, ai_decision, reasonCode 조합으로 정책 결정
     * 
     * @param issue      Issue VO (업데이트할 객체)
     * @param aiDecision AI 판정 결과 (PASS, FAIL, NEED_CHECK, RETAKE)
     * @param reasonCode AI 세부 분류 (STOCK_EXISTS, MOVE_LOCATION, WAITING_RETURN,
     *                   DAMAGED, UNKNOWN)
     */
    private void applyAiResultPolicy(IssueVO issue, String aiDecision, String reasonCode) {
        String issueType = issue.getIssueType();

        // DAMAGED 케이스
        if ("DAMAGED".equals(issueType)) {
            applyDamagedPolicy(issue, aiDecision);
        }
        // OUT_OF_STOCK 케이스
        else if ("OUT_OF_STOCK".equals(issueType)) {
            applyOutOfStockPolicy(issue, aiDecision, reasonCode);
        } else {
            log.warn("[IssueService] Unknown issue_type={}. Applying default policy.", issueType);
            applyDefaultPolicy(issue);
        }
    }

    /**
     * DAMAGED 타입 정책 (분기표 D1, D5, D8, D12 노드 기준)
     */
    /**
     * DAMAGED 타입 정책 (분기표 D1, D5, D8, D12 노드 기준)
     */
    private void applyDamagedPolicy(IssueVO issue, String aiDecision) {
        switch (aiDecision) {
            case "PASS":
                // D1: 정상 판정 - OPEN 유지, 관리자 사후 확정 필요
                issue.setStatus("OPEN");
                issue.setUrgency(4);
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("UNKNOWN");
                log.info("[IssueService] DAMAGED + PASS → OPEN, urgency=4, adminRequired=true. issueId={}",
                        issue.getIssueId());
                break;

            case "NEED_CHECK":
                // D5: 애매함 - BLOCKING, 관리자 필수 연결
                issue.setStatus("OPEN");
                issue.setUrgency(1);
                issue.setIssueHandling("BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("UNKNOWN");
                log.info("[IssueService] DAMAGED + NEED_CHECK → BLOCKING, urgency=1. issueId={}",
                        issue.getIssueId());
                break;

            case "FAIL":
                // D8: 파손 가능성 - NON_BLOCKING, 사후 확정 필요
                issue.setStatus("OPEN");
                issue.setUrgency(3);
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("DAMAGED");
                log.info("[IssueService] DAMAGED + FAIL → urgency=3, adminRequired=true. issueId={}",
                        issue.getIssueId());
                break;

            case "RETAKE":
                // D12: 재촬영 필요 - BLOCKING, 관리자 개입 없음, 관제 미노출
                issue.setStatus("OPEN");
                issue.setUrgency(0); // 관제 큐 제외
                issue.setIssueHandling("BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("UNKNOWN");
                log.info("[IssueService] DAMAGED + RETAKE → BLOCKING, urgency=0 (queue excluded). issueId={}",
                        issue.getIssueId());
                break;

            case "UNKNOWN":
            default:
                applyDefaultPolicy(issue);
                break;
        }
    }

    /**
     * OUT_OF_STOCK 타입 정책 (분기표 S1, S4, S5, S6 노드 기준)
     * 
     * AI가 reasonCode를 직접 반환하므로, aiDecision + reasonCode 조합으로 정책 적용
     */
    private void applyOutOfStockPolicy(IssueVO issue, String aiDecision, String reasonCode) {
        // reasonCode가 없으면 기본 정책 적용
        if (reasonCode == null || "UNKNOWN".equals(reasonCode)) {
            applyDefaultPolicy(issue);
            return;
        }

        switch (reasonCode) {
            case "STOCK_EXISTS":
                // S1: 전산상 재고 있음 - BLOCKING, 관리자 필수
                issue.setStatus("OPEN");
                issue.setUrgency(1);
                issue.setIssueHandling("BLOCKING");
                issue.setAdminRequired(true);
                issue.setReasonCode("STOCK_EXISTS");
                log.info("[IssueService] OUT_OF_STOCK + STOCK_EXISTS → BLOCKING, urgency=1. issueId={}",
                        issue.getIssueId());
                break;

            case "MOVE_LOCATION":
                // S4: 지번 이동 - 즉시 RESOLVED
                issue.setStatus("RESOLVED");
                issue.setUrgency(5);
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("MOVE_LOCATION");
                issue.setResolvedAt(java.time.LocalDateTime.now());
                // newLocationId는 processAiResult에서 설정됨
                log.info("[IssueService] OUT_OF_STOCK + MOVE_LOCATION → RESOLVED, urgency=5. issueId={}",
                        issue.getIssueId());
                break;

            case "WAITING_RETURN":
                // S5: 원복 대기 - NON_BLOCKING
                issue.setStatus("OPEN");
                issue.setUrgency(3);
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("WAITING_RETURN");
                log.info("[IssueService] OUT_OF_STOCK + WAITING_RETURN → urgency=3. issueId={}",
                        issue.getIssueId());
                break;

            case "DAMAGED":
                // S6: 파손 원인 - NON_BLOCKING
                issue.setStatus("OPEN");
                issue.setUrgency(3);
                issue.setIssueHandling("NON_BLOCKING");
                issue.setAdminRequired(false);
                issue.setReasonCode("DAMAGED");
                log.info("[IssueService] OUT_OF_STOCK + DAMAGED → urgency=3. issueId={}",
                        issue.getIssueId());
                break;

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
        // [140 가이드 반영] adminRequired가 true이면 항상 WAIT_ADMIN
        if (Boolean.TRUE.equals(issue.getAdminRequired())) {
            return IssueNextAction.WAIT_ADMIN;
        }

        // BLOCKING → WAIT_ADMIN (adminRequired가 false인데 BLOCKING인 경우 대비한 백업)
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

        // 나머지 → NEXT_ITEM
        return IssueNextAction.NEXT_ITEM;
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

    /**
     * 작업자 다음 행동 계산 (분기표 WorkerNextAction 컬럼 기준)
     */
    private WorkerNextAction calculateWorkerNextAction(IssueVO issue, AiJudgmentVO judgment) {
        // 이미지가 필요한 상황인지 체크 (OUT_OF_STOCK + AdminRequired + NoImage)
        if (isImageRequiredButMissing(issue)) {
            return WorkerNextAction.UPLOAD_REPORT_IMAGE;
        }

        // RETAKE 케이스
        if (judgment != null && "RETAKE".equals(judgment.getAiDecision())) {
            return WorkerNextAction.UPLOAD_IMAGE;
        }

        // BLOCKING 상태면 WAIT_ADMIN
        if ("BLOCKING".equals(issue.getIssueHandling())) {
            return WorkerNextAction.WAIT_ADMIN;
        }

        // MOVE_LOCATION 케이스
        if ("RESOLVED".equals(issue.getStatus()) && "MOVE_LOCATION".equals(issue.getReasonCode())) {
            return WorkerNextAction.MOVE_LOCATION;
        }

        // 기본값: CONTINUE_PICKING
        return WorkerNextAction.CONTINUE_PICKING;
    }

    private boolean isImageRequiredButMissing(IssueVO issue) {
        // OUT_OF_STOCK 이슈이고 관리자 확인 필요(adminRequired=true) 상태인데
        // 이미지가 등록되지 않았다면 사진 업로드 필요
        if ("OUT_OF_STOCK".equals(issue.getIssueType()) && Boolean.TRUE.equals(issue.getAdminRequired())) {
            // 이미지 존재 여부 확인 (AiJudgment가 있어도 RETAKE 등으로 인해 이미지가 없을 수 있으므로 직접 체크 권장하나
            // 성능상 issue_images 조회가 부담스러우면 AiJudgment의 imageUrl 확인)
            AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issue.getIssueId());
            // judgment가 없거나(초기), judgment에 이미지가 없으면 업로드 필요
            // 하지만 OUT_OF_STOCK은 초기 AI 분석 시 이미지가 없을 수 있음.
            // 정확히는 "현재 유효한 증빙 이미지가 있는가"를 체크해야 함.
            // 여기서는 간단히 "AiJudgment에 이미지가 없는 경우"를 미등록으로 간주
            // (createIssue에서 이미지 없이 생성하면 judgment.imageUrl도 null로 들어감)
            return judgment == null || judgment.getImageUrl() == null || judgment.getImageUrl().isEmpty();
        }
        return false;
    }

    @Transactional
    public void reportImage(Long workerId, Long issueId, String imageUrl) {
        log.info("[IssueService] reportImage started. workerId={}, issueId={}", workerId, issueId);

        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 권한 체크
        if (!workerId.equals(issue.getWorkerId())) {
            throw new ApiException(ErrorCode.ISSUE_TASK_NOT_ASSIGNED);
        }

        // 이미지 저장
        IssueImageVO image = new IssueImageVO();
        image.setIssueId(issue.getIssueId());
        image.setImageUrl(imageUrl);
        issueMapper.insertIssueImage(image);

        // AiJudgment에도 이미지 URL 업데이트 (관제에서 보기 위함, 재분석 X)
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        if (judgment != null) {
            judgment.setImageUrl(imageUrl);
            issueMapper.updateAiJudgment(judgment);
        }

        log.info("[IssueService] Report image saved. issueId={}", issueId);
    }

    /**
     * 이슈 다음 행동 계산 (분기표 IssueNextAction 컬럼 기준)
     */
    private IssueNextAction calculateIssueNextAction(IssueVO issue, AiJudgmentVO judgment) {
        // 이미지가 필요한 상황인지 체크
        if (isImageRequiredButMissing(issue)) {
            return IssueNextAction.WAIT_REPORT_IMAGE;
        }

        // RETAKE 케이스
        if (judgment != null && "RETAKE".equals(judgment.getAiDecision())) {
            return IssueNextAction.WAIT_RETAKE;
        }

        // BLOCKING 상태면 WAIT_ADMIN
        if ("BLOCKING".equals(issue.getIssueHandling())) {
            return IssueNextAction.WAIT_ADMIN;
        }

        // MOVE_LOCATION 케이스
        if ("RESOLVED".equals(issue.getStatus()) && "MOVE_LOCATION".equals(issue.getReasonCode())) {
            return IssueNextAction.MOVE_LOCATION;
        }

        // AUTO_RESOLVED 케이스
        if ("RESOLVED".equals(issue.getStatus())) {
            return IssueNextAction.AUTO_RESOLVED;
        }

        // 기본값: NEXT_ITEM
        return IssueNextAction.NEXT_ITEM;
    }

    /**
     * 관리자 다음 행동 계산 (분기표 AdminNextAction 컬럼 기준)
     */
    private AdminNextAction calculateAdminNextAction(IssueVO issue, AiJudgmentVO judgment) {
        // RETAKE 케이스 - 관리자 개입 없음
        if (judgment != null && "RETAKE".equals(judgment.getAiDecision())) {
            return AdminNextAction.RETAKE_IMAGE;
        }

        // RESOLVED 상태면 관리자 액션 없음
        if ("RESOLVED".equals(issue.getStatus())) {
            return null;
        }

        // BLOCKING 상태는 즉시 통화 필요 (NEED_CHECK, STOCK_EXISTS)
        if ("BLOCKING".equals(issue.getIssueHandling())) {
            return AdminNextAction.ADMIN_JOIN_CALL;
        }

        // adminRequired가 true이면 사후 확정 필요 (NON_BLOCKING + adminRequired=true)
        if (Boolean.TRUE.equals(issue.getAdminRequired())) {
            return AdminNextAction.ADMIN_CONFIRM_LATER;
        }

        return null;
    }

    // ================================================================
    // WebRTC 후처리 (분기표 D2~D4, D6~D7, D10~D11, S2~S3)
    // ================================================================

    /**
     * WebRTC 통화 연결 성공 처리
     * - 분기표 D3, D6, D10, S2 노드
     * - urgency=5 (최하위), adminRequired=false, handling=NON_BLOCKING
     * - 작업자는 즉시 다음 작업 진행, 관리자는 확정 필요
     * 
     * @param issueId Issue ID
     */
    @Transactional
    public void handleWebRtcConnected(Long issueId) {
        log.info("[IssueService] handleWebRtcConnected started. issueId={}", issueId);

        // 1. Issue 조회
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            log.warn("[IssueService] Issue not found. issueId={}", issueId);
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 2. 이미 RESOLVED면 처리 안 함
        // NOTE: Issue가 이미 RESOLVED면 WebRTC 결과로 상태를 덮어쓰지 않는다.
        // (MOVE_LOCATION 등 자동 해결 케이스 포함)
        if ("RESOLVED".equals(issue.getStatus())) {
            log.info("[IssueService] Issue already resolved. Skip WebRTC processing. issueId={}", issueId);
            return;
        }

        // 3. WebRTC CONNECTED 정책 적용
        issue.setUrgency(5); // 최하위 우선순위
        issue.setAdminRequired(false); // 관리자 확인 불필요 (통화 완료)
        issue.setIssueHandling("NON_BLOCKING"); // 작업자 즉시 진행 가능

        // 4. Issue 업데이트
        issueMapper.updateIssueStatus(issue);
        log.info("[IssueService] WebRTC CONNECTED processed. issueId={}, urgency=5, adminRequired=false",
                issueId);
    }

    /**
     * WebRTC 통화 연결 실패 처리 (MISSED/REJECTED/TIMEOUT)
     * - 분기표 D4, D7, D11, S3 노드
     * - urgency 조정: NEED_CHECK/STOCK_EXISTS → 1, 나머지 → 2
     * - adminRequired=true 유지, handling=NON_BLOCKING
     * - 작업자는 계속 진행, 관제 큐 유지
     * 
     * @param issueId Issue ID
     */
    @Transactional
    public void handleWebRtcMissed(Long issueId) {
        log.info("[IssueService] handleWebRtcMissed started. issueId={}", issueId);

        // 1. Issue 조회
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            log.warn("[IssueService] Issue not found. issueId={}", issueId);
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 2. 이미 RESOLVED면 처리 안 함
        // NOTE: Issue가 이미 RESOLVED면 WebRTC 결과로 상태를 덮어쓰지 않는다.
        if ("RESOLVED".equals(issue.getStatus())) {
            log.info("[IssueService] Issue already resolved. Skip WebRTC processing. issueId={}", issueId);
            return;
        }

        // 3. AI 판정 결과 조회
        AiJudgmentVO judgment = issueMapper.findAiJudgmentByIssueId(issueId);
        String aiDecision = judgment != null ? judgment.getAiDecision() : "UNKNOWN";
        String reasonCode = issue.getReasonCode();

        // 4. WebRTC MISSED 정책 적용
        // NOTE: OUT_OF_STOCK은 reasonCode만 신뢰 (aiDecision은 참고용)
        // NEED_CHECK 또는 STOCK_EXISTS는 최상위 urgency=1
        if ("NEED_CHECK".equals(aiDecision) || "STOCK_EXISTS".equals(reasonCode)) {
            issue.setUrgency(1); // 관제 큐 최상위
            log.info("[IssueService] NEED_CHECK/STOCK_EXISTS → urgency=1. issueId={}", issueId);
        } else {
            // 이미지가 없는 OUT_OF_STOCK 이슈는 사진 업로드 대기 상태로 유지하기 위해 urgency 조정
            // (여기서는 일반적인 2로 설정하되, NextAction 계산 시 이미지 유무 체크)
            issue.setUrgency(2); // 그 외 → urgency=2
            log.info("[IssueService] Other cases → urgency=2. issueId={}", issueId);
        }

        issue.setAdminRequired(true); // 관리자 확인 필요 (연결 실패)
        issue.setIssueHandling("NON_BLOCKING"); // 작업자는 계속 진행 가능

        // 5. Issue 업데이트
        issueMapper.updateIssueStatus(issue);
        log.info("[IssueService] WebRTC MISSED processed. issueId={}, urgency={}, adminRequired=true",
                issueId, issue.getUrgency());
    }

    // ================================================================
    // 관리자 확정 (분기표 D14, S7)
    // ================================================================

    private static final Set<AdminDecision> DAMAGED_ALLOWED = Set.of(
            AdminDecision.NORMAL, AdminDecision.DAMAGED, AdminDecision.CALLED_OTHER_PROCESS);

    private static final Set<AdminDecision> OUT_OF_STOCK_ALLOWED = Set.of(
            AdminDecision.FIXED);

    /**
     * 관리자 확정 처리
     * - 분기표 D14, S7 노드
     * - status → RESOLVED
     * - adminDecision 저장
     * - resolvedAt 설정
     * - Inventory Event 기록 (DAMAGED만, 현재는 주석 처리)
     * 
     * @param issueId       Issue ID
     * @param adminDecision 관리자 확정 결과 (NORMAL/DAMAGED/CALLED_OTHER_PROCESS/FIXED)
     */
    @Transactional
    public void confirmIssue(Long issueId, AdminDecision adminDecision) {
        log.info("[IssueService] confirmIssue started. issueId={}, adminDecision={}",
                issueId, adminDecision);

        // 1. Issue 조회
        IssueVO issue = issueMapper.findById(issueId);
        if (issue == null) {
            log.warn("[IssueService] Issue not found. issueId={}", issueId);
            throw new ApiException(ErrorCode.ISSUE_NOT_FOUND);
        }

        // 2. 이미 RESOLVED면 중복 확정 방지
        if ("RESOLVED".equals(issue.getStatus())) {
            log.warn("[IssueService] Issue already resolved. issueId={}", issueId);
            throw new ApiException(ErrorCode.ISSUE_ALREADY_RESOLVED);
        }

        // 3. adminDecision 검증
        validateAdminDecision(issue.getIssueType(), adminDecision);

        // 4. 확정 처리
        issue.setStatus("RESOLVED");
        issue.setAdminDecision(adminDecision.name());
        issue.setResolvedAt(java.time.LocalDateTime.now());

        // 5. Issue 업데이트
        issueMapper.updateIssueStatus(issue);
        log.info("[IssueService] Admin confirmed. issueId={}, adminDecision={}",
                issueId, adminDecision);

        // 6. Inventory Event 기록 (DAMAGED 타입 + DAMAGED 확정만)
        if ("DAMAGED".equals(issue.getIssueType()) && AdminDecision.DAMAGED.equals(adminDecision)) {
            // TODO: Inventory Event 시스템 구현 후 활성화
            // eventService.recordInventoryEvent(
            // issue.getProductId(),
            // "PICK_DAMAGED_FINAL",
            // -1,
            // issueId
            // );
            log.info(
                    "[IssueService] Inventory event required (currently commented). issueId={}, type=PICK_DAMAGED_FINAL, qty=-1",
                    issueId);
        }
    }

    /**
     * adminDecision 유효성 검증
     */
    private void validateAdminDecision(String issueType, AdminDecision adminDecision) {
        if ("DAMAGED".equals(issueType)) {
            // DAMAGED 타입 허용 값 검증
            if (!DAMAGED_ALLOWED.contains(adminDecision)) {
                throw new ApiException(ErrorCode.INVALID_ADMIN_DECISION);
            }
        } else if ("OUT_OF_STOCK".equals(issueType)) {
            // OUT_OF_STOCK 타입 허용 값 검증
            if (!OUT_OF_STOCK_ALLOWED.contains(adminDecision)) {
                throw new ApiException(ErrorCode.INVALID_ADMIN_DECISION);
            }
        } else {
            throw new ApiException(ErrorCode.INVALID_ISSUE_TYPE);
        }
    }

    /**
     * 관리자 관제 이슈 목록 조회
     */
    @Transactional(readOnly = true)
    public AdminIssueListResponse getAdminIssueList(Long adminId, AdminIssueListRequest request) {
        log.info("[IssueService] getAdminIssueList started. adminId={}, status={}, page={}",
                adminId, request.getStatus(), request.getPage());

        List<AdminIssueSummary> issues = issueMapper.findAdminIssues(adminId, request);

        long totalCount = issueMapper.countAdminIssues(adminId, request);

        return AdminIssueListResponse.of(issues, request.getPage(), request.getSize(),
                totalCount);
    }

    /**
     * 내 이슈 목록 조회
     * - 작업자 본인의 이슈 목록 조회
     * - status 필터링 지원 (OPEN/RESOLVED/null=ALL)
     */
    @Transactional(readOnly = true)
    public List<MyIssueSummary> getMyIssueList(Long workerId, IssueStatus status) {
        log.info("[IssueService] getMyIssueList started. workerId={}, status={}", workerId, status);
        return issueMapper.findMyIssues(workerId, status);
    }
}
