package lookie.backend.domain.issue.service;

import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.domain.issue.dto.AdminDecision;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
import lookie.backend.domain.issue.dto.IssueDetailResponse;
import lookie.backend.domain.issue.dto.IssueResponse;
import lookie.backend.domain.issue.mapper.IssueMapper;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.service.TaskItemService;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.infra.ai.AiAnalysisClient;
import lookie.backend.infra.ai.dto.AiAnalysisRequest;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IssueServiceTest {

    @Mock
    private IssueMapper issueMapper;

    @Mock
    private TaskItemService taskItemService;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private AiAnalysisClient aiAnalysisClient;

    @InjectMocks
    private IssueService issueService;

    @Test
    @DisplayName("이슈 생성 성공")
    void createIssue_Success() {
        // given
        Long workerId = 1L;
        Long taskId = 100L;
        Long itemId = 200L;
        Long locationId = 10L;

        CreateIssueRequest request = new CreateIssueRequest();
        request.setBatchTaskId(taskId);
        request.setBatchTaskItemId(itemId);
        request.setIssueType("DAMAGED");
        request.setImageUrl("https://example.com/image.jpg");

        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(itemId);
        item.setBatchTaskId(taskId);
        item.setLocationId(locationId);
        item.setStatus("PENDING");

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setWorkerId(workerId);

        when(taskItemService.getTaskItem(itemId)).thenReturn(item);
        when(taskMapper.findById(taskId)).thenReturn(task);

        // when
        IssueResponse response = issueService.createIssue(workerId, request);

        // then
        assertNotNull(response);

        // IssueVO 저장 검증 - createInitial() 팩토리 메서드 사용 확인
        ArgumentCaptor<IssueVO> issueCaptor = ArgumentCaptor.forClass(IssueVO.class);
        verify(issueMapper).insertIssue(issueCaptor.capture());
        IssueVO capturedIssue = issueCaptor.getValue();

        // 기본 정책 검증 (IssueVO.createInitial 기본값)
        assertEquals("DAMAGED", capturedIssue.getIssueType());
        assertEquals("OPEN", capturedIssue.getStatus());
        // assertEquals("MEDIUM", capturedIssue.getPriority()); // 삭제
        assertEquals(3, capturedIssue.getUrgency()); // 신규 필드 검증
        assertEquals("NON_BLOCKING", capturedIssue.getIssueHandling());
        assertEquals(false, capturedIssue.getAdminRequired());
        assertEquals("UNKNOWN", capturedIssue.getReasonCode());

        // 연관 데이터 검증
        assertEquals(workerId, capturedIssue.getWorkerId());
        assertEquals(taskId, capturedIssue.getBatchTaskId());
        assertEquals(itemId, capturedIssue.getBatchTaskItemId());
        assertEquals(locationId, capturedIssue.getZoneLocationId());

        // IssueImageVO 저장 검증
        ArgumentCaptor<IssueImageVO> imageCaptor = ArgumentCaptor.forClass(IssueImageVO.class);
        verify(issueMapper).insertIssueImage(imageCaptor.capture());
        assertEquals(request.getImageUrl(), imageCaptor.getValue().getImageUrl());

        // AiJudgmentVO 저장 검증
        ArgumentCaptor<AiJudgmentVO> judgmentCaptor = ArgumentCaptor.forClass(AiJudgmentVO.class);
        verify(issueMapper).insertAiJudgment(judgmentCaptor.capture());
        AiJudgmentVO capturedJudgment = judgmentCaptor.getValue();
        assertEquals("UNKNOWN", capturedJudgment.getAiDecision());
        assertEquals(request.getImageUrl(), capturedJudgment.getImageUrl());

        // TaskItem 상태 변경 검증
        verify(taskItemService).markAsIssue(itemId);

        // AI 분석 요청 검증 추가
        verify(aiAnalysisClient).requestAnalysis(any(AiAnalysisRequest.class));
    }

    @Test
    @DisplayName("이슈 생성 성공 - OUT_OF_STOCK")
    void createIssue_Success_OutOfStock() {
        // given
        Long workerId = 1L;
        Long taskId = 100L;
        Long itemId = 200L;

        CreateIssueRequest request = new CreateIssueRequest();
        request.setBatchTaskId(taskId);
        request.setBatchTaskItemId(itemId);
        request.setIssueType("OUT_OF_STOCK");
        request.setImageUrl("https://example.com/image.jpg");

        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(itemId);
        item.setBatchTaskId(taskId);
        item.setStatus("PENDING");

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setWorkerId(workerId);

        when(taskItemService.getTaskItem(itemId)).thenReturn(item);
        when(taskMapper.findById(taskId)).thenReturn(task);

        // when
        IssueResponse response = issueService.createIssue(workerId, request);

        // then
        assertNotNull(response);
        ArgumentCaptor<IssueVO> issueCaptor = ArgumentCaptor.forClass(IssueVO.class);
        verify(issueMapper).insertIssue(issueCaptor.capture()); // 누락된 캡처 코드 복구
        assertEquals("OUT_OF_STOCK", issueCaptor.getValue().getIssueType());

        // AI 분석 요청 검증 추가
        verify(aiAnalysisClient).requestAnalysis(any(AiAnalysisRequest.class));
    }

    @Test
    @DisplayName("이슈 생성 실패: TaskItem이 존재하지 않음")
    void createIssue_Fail_ItemNotFound() {
        // given
        Long workerId = 1L;
        Long itemId = 999L;

        CreateIssueRequest request = new CreateIssueRequest();
        request.setBatchTaskId(100L);
        request.setBatchTaskItemId(itemId);
        request.setIssueType("DAMAGED");
        request.setImageUrl("https://example.com/image.jpg");

        when(taskItemService.getTaskItem(itemId)).thenReturn(null);

        // when & then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.createIssue(workerId, request);
        });

        assertEquals(ErrorCode.ISSUE_ITEM_NOT_FOUND, exception.getErrorCode());

        // 후속 작업이 실행되지 않았는지 검증
        verify(issueMapper, never()).insertIssue(any());
        verify(issueMapper, never()).insertIssueImage(any());
        verify(issueMapper, never()).insertAiJudgment(any());
        verify(taskItemService, never()).markAsIssue(any());
        verify(aiAnalysisClient, never()).requestAnalysis(any());
    }

    @Test
    @DisplayName("이슈 생성 실패: 다른 작업자의 작업에 이슈 신고 시도")
    void createIssue_Fail_TaskNotAssigned() {
        // given
        Long workerId = 1L;
        Long otherWorkerId = 99L;
        Long taskId = 100L;
        Long itemId = 200L;

        CreateIssueRequest request = new CreateIssueRequest();
        request.setBatchTaskId(taskId);
        request.setBatchTaskItemId(itemId);
        request.setIssueType("DAMAGED");
        request.setImageUrl("https://example.com/image.jpg");

        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(itemId);
        item.setBatchTaskId(taskId);
        item.setLocationId(10L);

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setWorkerId(otherWorkerId); // 다른 작업자의 작업!

        when(taskItemService.getTaskItem(itemId)).thenReturn(item);
        when(taskMapper.findById(taskId)).thenReturn(task);

        // when & then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.createIssue(workerId, request);
        });

        assertEquals(ErrorCode.ISSUE_TASK_NOT_ASSIGNED, exception.getErrorCode());

        // 후속 작업이 실행되지 않았는지 검증
        verify(issueMapper, never()).insertIssue(any());
        verify(issueMapper, never()).insertIssueImage(any());
        verify(issueMapper, never()).insertAiJudgment(any());
        verify(taskItemService, never()).markAsIssue(any());
    }

    @Test
    @DisplayName("이슈 생성 시 모든 트랜잭션 작업이 순서대로 실행됨")
    void createIssue_TransactionOrder() {
        // given
        Long workerId = 1L;
        CreateIssueRequest request = new CreateIssueRequest();
        request.setBatchTaskId(100L);
        request.setBatchTaskItemId(200L);
        request.setIssueType("DAMAGED");
        request.setImageUrl("https://example.com/image.jpg");

        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(200L);
        item.setBatchTaskId(100L);
        item.setLocationId(10L);

        TaskVO task = new TaskVO();
        task.setBatchTaskId(100L);
        task.setWorkerId(workerId);

        when(taskItemService.getTaskItem(200L)).thenReturn(item);
        when(taskMapper.findById(100L)).thenReturn(task);

        // when
        issueService.createIssue(workerId, request);

        // then - 호출 순서 검증
        var inOrder = inOrder(issueMapper, taskItemService);
        inOrder.verify(issueMapper).insertIssue(any(IssueVO.class));
        inOrder.verify(issueMapper).insertIssueImage(any(IssueImageVO.class));
        inOrder.verify(issueMapper).insertAiJudgment(any(AiJudgmentVO.class));
        inOrder.verify(taskItemService).markAsIssue(200L);

        // requestAnalysis는 비동기 호출이므로 InOrder에서 제외될 수도 있지만 일단 마지막에 검증
        verify(aiAnalysisClient).requestAnalysis(any(AiAnalysisRequest.class));
    }

    @Test
    @DisplayName("재촬영 요청 성공 - AI 판정 초기화 및 분석 재요청")
    void retakeIssue_Success() {
        // given
        Long workerId = 1L;
        Long issueId = 100L;
        String newImageUrl = "https://example.com/new-image.jpg";

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setWorkerId(workerId);
        issue.setBatchTaskItemId(200L); // for taskItemService.getTaskItem

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setIssueId(issueId);
        judgment.setAiDecision("RETAKE"); // 기존 상태가 RETAKE라고 가정

        TaskItemVO item = new TaskItemVO();
        item.setProductId(500L);

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);
        when(taskItemService.getTaskItem(200L)).thenReturn(item);

        // when
        issueService.retakeIssue(workerId, issueId, newImageUrl);

        // then
        // 1. 새 이미지 저장 검증
        ArgumentCaptor<IssueImageVO> imageCaptor = ArgumentCaptor.forClass(IssueImageVO.class);
        verify(issueMapper).insertIssueImage(imageCaptor.capture());
        assertEquals(newImageUrl, imageCaptor.getValue().getImageUrl());
        assertEquals(issueId, imageCaptor.getValue().getIssueId());

        // 2. AI 판정 상태 리셋 검증 (핵심)
        ArgumentCaptor<AiJudgmentVO> judgmentCaptor = ArgumentCaptor.forClass(AiJudgmentVO.class);
        verify(issueMapper).updateAiJudgment(judgmentCaptor.capture());
        AiJudgmentVO updatedJudgment = judgmentCaptor.getValue();

        assertEquals("UNKNOWN", updatedJudgment.getAiDecision()); // 상태 리셋
        assertEquals(newImageUrl, updatedJudgment.getImageUrl()); // URL 교체
        assertNull(updatedJudgment.getConfidence()); // 신뢰도 초기화
        assertNull(updatedJudgment.getAiResult()); // 결과 초기화

        // 3. AI 분석 요청 재전송 검증
        ArgumentCaptor<AiAnalysisRequest> requestCaptor = ArgumentCaptor.forClass(AiAnalysisRequest.class);
        verify(aiAnalysisClient).requestAnalysis(requestCaptor.capture());

        assertEquals(issueId, requestCaptor.getValue().getIssueId());
        assertEquals(500L, requestCaptor.getValue().getProductId());
        assertEquals(newImageUrl, requestCaptor.getValue().getImageUrl());
    }

    // ================================================================
    // AI 판정 결과 처리 테스트
    // ================================================================

    @Test
    @DisplayName("AI 결과 처리 성공 - PASS (분기표 D1: OPEN 유지, 사후 확정 필요)")
    void processAiResult_Pass_AutoResolved() {
        // given
        Long issueId = 1L;
        AiResultRequest request = new AiResultRequest();
        request.setAiDecision("PASS");
        request.setConfidence(0.95f);
        request.setSummary("정상 상품으로 판정됨");

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        AiResultResponse response = issueService.processAiResult(issueId, request);

        // then
        assertNotNull(response);
        assertEquals("OPEN", response.getStatus()); // OPEN 유지
        // assertEquals("MEDIUM", response.getPriority()); // 삭제
        assertEquals(4, response.getUrgency()); // urgency=4
        assertEquals("NON_BLOCKING", response.getIssueHandling());
        assertEquals(true, response.getAdminRequired()); // 관리자 사후 확정 필요
        assertEquals("UNKNOWN", response.getReasonCode());
        assertNull(response.getResolvedAt()); // RESOLVED 아님

        verify(issueMapper).updateAiJudgment(any(AiJudgmentVO.class));
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("AI 결과 처리 성공 - NEED_CHECK (관리자 확인 필요)")
    void processAiResult_NeedCheck_AdminRequired() {
        // given
        Long issueId = 1L;
        AiResultRequest request = new AiResultRequest();
        request.setAiDecision("NEED_CHECK");
        request.setConfidence(0.6f);
        request.setSummary("확인 필요");

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        AiResultResponse response = issueService.processAiResult(issueId, request);

        // then
        assertEquals("OPEN", response.getStatus());
        // assertEquals("HIGH", response.getPriority()); // 삭제
        assertEquals(1, response.getUrgency()); // urgency=1
        assertEquals("BLOCKING", response.getIssueHandling()); // 가이드에 따라 BLOCKING으로 변경됨
        assertEquals(true, response.getAdminRequired());
        assertEquals("UNKNOWN", response.getReasonCode());
    }

    @Test
    @DisplayName("AI 결과 처리 성공 - FAIL (파손 확정)")
    void processAiResult_Fail_Damaged() {
        // given
        Long issueId = 1L;
        AiResultRequest request = new AiResultRequest();
        request.setAiDecision("FAIL");
        request.setConfidence(0.88f);
        request.setSummary("명확한 파손 감지");

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        AiResultResponse response = issueService.processAiResult(issueId, request);

        // then
        // assertEquals("MEDIUM", response.getPriority()); // 삭제
        assertEquals(3, response.getUrgency()); // urgency=3
        assertEquals(true, response.getAdminRequired()); // 사후 확정 필요
        assertEquals("DAMAGED", response.getReasonCode());
    }

    @Test
    @DisplayName("AI 결과 처리 실패 - Issue 없음")
    void processAiResult_Fail_IssueNotFound() {
        // given
        Long issueId = 999L;
        AiResultRequest request = new AiResultRequest();
        request.setAiDecision("PASS");

        when(issueMapper.findById(issueId)).thenReturn(null);

        // when & then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.processAiResult(issueId, request);
        });

        assertEquals(ErrorCode.ISSUE_NOT_FOUND, exception.getErrorCode());
        verify(issueMapper, never()).updateAiJudgment(any());
        verify(issueMapper, never()).updateIssueStatus(any());
    }

    @Test
    @DisplayName("AI 결과 처리 무시 - 이미 판정이 완료된 경우 (중복 요청)")
    void processAiResult_DuplicateRequest_Ignore() {
        // given
        Long issueId = 1L;
        AiResultRequest request = new AiResultRequest();
        request.setAiDecision("FAIL");

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("RESOLVED");

        AiJudgmentVO existingJudgment = new AiJudgmentVO();
        existingJudgment.setAiDecision("PASS"); // 이미 판정된 상태

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(existingJudgment);

        // when
        AiResultResponse response = issueService.processAiResult(issueId, request);

        // then
        assertNotNull(response);
        assertEquals("RESOLVED", response.getStatus());
        // 중요: DB 업데이트 메서드들이 호출되지 않아야 함
        verify(issueMapper, never()).updateAiJudgment(any(AiJudgmentVO.class));
        verify(issueMapper, never()).updateIssueStatus(any(IssueVO.class));
    }

    // ================================================================
    // 이슈 상세 조회 테스트
    // ================================================================

    @Test
    @DisplayName("이슈 상세 조회 성공 - AI 판정 완료")
    void getIssueDetail_Success_WithAiJudgment() {
        // given
        Long issueId = 1L;

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("RESOLVED");
        // issue.setPriority("LOW"); // 삭제
        issue.setUrgency(5); // LOW 대응
        issue.setIssueHandling("NON_BLOCKING");
        issue.setAdminRequired(false);
        issue.setReasonCode("AUTO_RESOLVED");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("PASS");
        judgment.setConfidence(0.95f);
        judgment.setSummary("정상 상품으로 판정됨");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        // then
        assertNotNull(response);
        assertEquals(issueId, response.getIssueId());
        assertEquals("DAMAGED", response.getType());
        assertEquals("RESOLVED", response.getStatus());
        assertEquals("PASS", response.getAiResult());
        assertEquals(0.95f, response.getConfidence());
        assertEquals("정상 상품으로 판정됨", response.getSummary());
        assertEquals("AUTO_RESOLVED", response.getIssueNextAction());
        assertTrue(response.getAvailableActions().isEmpty());
    }

    @Test
    @DisplayName("이슈 상세 조회 성공 - 관리자 확인 필요")
    void getIssueDetail_Success_AdminRequired() {
        // given
        Long issueId = 2L;

        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");
        // issue.setPriority("HIGH"); // 삭제
        issue.setUrgency(1); // HIGH 대응
        issue.setIssueHandling("BLOCKING");
        issue.setAdminRequired(true);
        issue.setReasonCode("UNKNOWN");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("NEED_CHECK");
        judgment.setConfidence(0.55f);

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        // then
        assertNotNull(response);
        assertEquals("NEED_CHECK", response.getAiResult());
        assertEquals("WAIT_ADMIN", response.getIssueNextAction());
        assertEquals(1, response.getAvailableActions().size());
        assertTrue(response.getAvailableActions().contains("CONNECT_ADMIN"));
    }

    @Test
    @DisplayName("이슈 상세 조회 실패 - 존재하지 않는 이슈")
    void getIssueDetail_NotFound() {
        // given
        Long issueId = 999L;
        when(issueMapper.findById(issueId)).thenReturn(null);

        // when & then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.getIssueDetail(issueId);
        });

        assertEquals(ErrorCode.ISSUE_NOT_FOUND, exception.getErrorCode());
    }

    // ================================================================
    // WebRTC 후처리 테스트
    // ================================================================

    @Test
    @DisplayName("WebRTC CONNECTED - urgency=5, adminRequired=false")
    void handleWebRtcConnected_Success() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("OPEN");
        issue.setUrgency(1); // 초기 urgency
        issue.setAdminRequired(true);
        issue.setIssueHandling("BLOCKING");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        issueService.handleWebRtcConnected(issueId);

        // then
        assertEquals(5, issue.getUrgency());
        assertEquals(false, issue.getAdminRequired());
        assertEquals("NON_BLOCKING", issue.getIssueHandling());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("WebRTC MISSED (NEED_CHECK) - urgency=1 유지")
    void handleWebRtcMissed_NeedCheck() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("OPEN");
        issue.setUrgency(1);
        issue.setReasonCode("UNKNOWN");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("NEED_CHECK");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        issueService.handleWebRtcMissed(issueId);

        // then
        assertEquals(1, issue.getUrgency()); // NEED_CHECK → urgency=1
        assertEquals(true, issue.getAdminRequired());
        assertEquals("NON_BLOCKING", issue.getIssueHandling());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("WebRTC MISSED (STOCK_EXISTS) - urgency=1")
    void handleWebRtcMissed_StockExists() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("OPEN");
        issue.setUrgency(1);
        issue.setReasonCode("STOCK_EXISTS");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("PASS");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        issueService.handleWebRtcMissed(issueId);

        // then
        assertEquals(1, issue.getUrgency()); // STOCK_EXISTS → urgency=1
        assertEquals(true, issue.getAdminRequired());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("WebRTC MISSED (PASS/FAIL) - urgency=2")
    void handleWebRtcMissed_Other() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("OPEN");
        issue.setUrgency(4);
        issue.setReasonCode("UNKNOWN");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("PASS");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        issueService.handleWebRtcMissed(issueId);

        // then
        assertEquals(2, issue.getUrgency()); // 기타 → urgency=2
        assertEquals(true, issue.getAdminRequired());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("WebRTC CONNECTED - 이미 RESOLVED면 스킵")
    void handleWebRtcConnected_AlreadyResolved() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("RESOLVED");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        issueService.handleWebRtcConnected(issueId);

        // then
        verify(issueMapper, never()).updateIssueStatus(any());
    }

    // ================================================================
    // AdminNextAction 검증 테스트
    // ================================================================

    @Test
    @DisplayName("AdminNextAction - STOCK_EXISTS는 ADMIN_JOIN_CALL")
    void calculateAdminNextAction_StockExists() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("OUT_OF_STOCK");
        issue.setStatus("OPEN");
        issue.setIssueHandling("BLOCKING");
        issue.setAdminRequired(true);
        issue.setReasonCode("STOCK_EXISTS");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("PASS");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        // then
        assertEquals("ADMIN_JOIN_CALL", response.getAdminNextAction());
    }

    @Test
    @DisplayName("AdminNextAction - NEED_CHECK는 ADMIN_JOIN_CALL")
    void calculateAdminNextAction_NeedCheck() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");
        issue.setIssueHandling("BLOCKING");
        issue.setAdminRequired(true);

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("NEED_CHECK");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        // then
        assertEquals("ADMIN_JOIN_CALL", response.getAdminNextAction());
    }

    @Test
    @DisplayName("AdminNextAction - NON_BLOCKING + adminRequired는 ADMIN_CONFIRM_LATER")
    void calculateAdminNextAction_ConfirmLater() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");
        issue.setIssueHandling("NON_BLOCKING");
        issue.setAdminRequired(true);
        issue.setReasonCode("DAMAGED");

        AiJudgmentVO judgment = new AiJudgmentVO();
        judgment.setAiDecision("FAIL");

        when(issueMapper.findById(issueId)).thenReturn(issue);
        when(issueMapper.findAiJudgmentByIssueId(issueId)).thenReturn(judgment);

        // when
        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        // then
        assertEquals("ADMIN_CONFIRM_LATER", response.getAdminNextAction());
    }

    // ================================================================
    // 관리자 확정 테스트
    // ================================================================

    @Test
    @DisplayName("관리자 확정 성공 - DAMAGED + NORMAL")
    void confirmIssue_Damaged_Normal() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        issueService.confirmIssue(issueId, AdminDecision.NORMAL);

        // then
        assertEquals("RESOLVED", issue.getStatus());
        assertEquals("NORMAL", issue.getAdminDecision());
        assertNotNull(issue.getResolvedAt());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("관리자 확정 성공 - OUT_OF_STOCK + FIXED")
    void confirmIssue_OutOfStock_Fixed() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("OUT_OF_STOCK");
        issue.setStatus("OPEN");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when
        issueService.confirmIssue(issueId, AdminDecision.FIXED);

        // then
        assertEquals("RESOLVED", issue.getStatus());
        assertEquals("FIXED", issue.getAdminDecision());
        verify(issueMapper).updateIssueStatus(issue);
    }

    @Test
    @DisplayName("관리자 확정 실패 - 이미 RESOLVED")
    void confirmIssue_AlreadyResolved() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setStatus("RESOLVED");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when, then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.confirmIssue(issueId, AdminDecision.NORMAL);
        });

        assertEquals(ErrorCode.ISSUE_ALREADY_RESOLVED, exception.getErrorCode());
        // verify TaskItem update if FIXED
        verify(taskItemService, never()).markAsIssue(any()); // Assuming markAsIssue is not called or needed for FIXED?
                                                             // Actually it might be handled by frontend flow or
                                                             // separate logic.
        // For OUT_OF_STOCK FIXED, usually means admin solved it.
    }

    @Test
    @DisplayName("관리자 확정 실패 - 유효하지 않은 결정 (DAMAGED에 FIXED 적용 불가)")
    void confirmIssue_Fail_InvalidDecision() {
        // given
        Long issueId = 1L;
        IssueVO issue = new IssueVO();
        issue.setIssueId(issueId);
        issue.setIssueType("DAMAGED");
        issue.setStatus("OPEN");

        when(issueMapper.findById(issueId)).thenReturn(issue);

        // when & then
        ApiException exception = assertThrows(ApiException.class, () -> {
            issueService.confirmIssue(issueId, AdminDecision.FIXED); // DAMAGED에는 FIXED 불가
        });

        assertEquals(ErrorCode.INVALID_ADMIN_DECISION, exception.getErrorCode());
        verify(issueMapper, never()).updateIssueStatus(any());
    }

    @Test
    @DisplayName("관리자 관제 리스트 조회 - 성공")
    void getAdminIssueList_Success() {
        // given
        Long adminId = 1L;
        lookie.backend.domain.issue.dto.AdminIssueListRequest request = new lookie.backend.domain.issue.dto.AdminIssueListRequest();
        request.setStatus(lookie.backend.domain.issue.dto.IssueStatus.OPEN);
        request.setPage(1);
        request.setSize(10);

        lookie.backend.domain.issue.dto.AdminIssueSummary issue1 = lookie.backend.domain.issue.dto.AdminIssueSummary
                .builder()
                .issueId(101L)
                .issueType("DAMAGED")
                .status("OPEN")
                .urgency(1)
                .workerName("홍길동")
                .productName("티셔츠")
                .build();

        java.util.List<lookie.backend.domain.issue.dto.AdminIssueSummary> mockIssues = java.util.List.of(issue1);

        when(issueMapper.findAdminIssues(adminId, request)).thenReturn(mockIssues);
        when(issueMapper.countAdminIssues(adminId, request)).thenReturn(1L);

        // when
        lookie.backend.domain.issue.dto.AdminIssueListResponse response = issueService.getAdminIssueList(adminId,
                request);

        // then
        assertNotNull(response);
        assertEquals(1, response.getIssues().size());
        assertEquals("홍길동", response.getIssues().get(0).getWorkerName());
        assertEquals(1, response.getPaging().getTotalCount());
        assertEquals(1, response.getPaging().getTotalPages());

        verify(issueMapper).findAdminIssues(adminId, request);
        verify(issueMapper).countAdminIssues(adminId, request);
    }
}
