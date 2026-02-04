package lookie.backend.domain.issue.mapper;

import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import lookie.backend.domain.issue.dto.IssueStatus;
import lookie.backend.domain.issue.dto.MyIssueSummary;

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

        // 관리자 관제 리스트 조회
        java.util.List<lookie.backend.domain.issue.dto.AdminIssueSummary> findAdminIssues(
                        @Param("adminId") Long adminId,
                        @Param("req") lookie.backend.domain.issue.dto.AdminIssueListRequest req);

        // 관리자 관제 리스트 카운트
        long countAdminIssues(
                        @Param("adminId") Long adminId,
                        @Param("req") lookie.backend.domain.issue.dto.AdminIssueListRequest req);

        // 내 이슈 목록 조회
        List<MyIssueSummary> findMyIssues(
                        @Param("workerId") Long workerId,
                        @Param("status") IssueStatus status);
}
