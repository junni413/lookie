package lookie.backend.domain.issue.mapper;

import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface IssueMapper {

    // Issue 생성
    void insertIssue(IssueVO issueVO);

    // Issue ID로 조회
    IssueVO findById(@Param("issueId") Long issueId);

    // Issue 상태 업데이트
    void updateIssueStatus(IssueVO issueVO);

    // 이미지 저장
    void insertIssueImage(IssueImageVO issueImageVO);

    // AI 판정 초기 저장
    void insertAiJudgment(AiJudgmentVO aiJudgmentVO);

    // AI 판정 결과 업데이트
    void updateAiJudgment(AiJudgmentVO aiJudgmentVO);

    // Issue ID로 AI 판정 조회
    AiJudgmentVO findAiJudgmentByIssueId(@Param("issueId") Long issueId);
}
