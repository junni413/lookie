package lookie.backend.domain.issue.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        IssueVO issue = IssueVO.createInitial(workerId, item);

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
}
