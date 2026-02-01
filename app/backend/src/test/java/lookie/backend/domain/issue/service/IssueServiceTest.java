package lookie.backend.domain.issue.service;

import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
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
        assertEquals("MEDIUM", capturedIssue.getPriority());
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
    }

    // ================================================================
    // AI 판정 결과 처리 테스트
    // ================================================================

    @Test
    @DisplayName("AI 결과 처리 성공 - PASS (자동 해결)")
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
        assertEquals("RESOLVED", response.getStatus());
        assertEquals("LOW", response.getPriority());
        assertEquals("NON_BLOCKING", response.getIssueHandling());
        assertEquals(false, response.getAdminRequired());
        assertEquals("AUTO_RESOLVED", response.getReasonCode());
        assertNotNull(response.getResolvedAt());

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
        assertEquals("HIGH", response.getPriority());
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
        assertEquals("MEDIUM", response.getPriority());
        assertEquals(false, response.getAdminRequired());
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
}
