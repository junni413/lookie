package lookie.backend.domain.issue.mapper;

import lookie.backend.domain.issue.dto.IssueDto;
import lookie.backend.domain.issue.dto.IssueStatus;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueImageVO;
import lookie.backend.domain.issue.vo.IssueVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IssueMapper {

        // Issue 생성
        void insertIssue(IssueVO issueVO);

        // Issue ID로 조회
        IssueVO findById(@Param("issueId") Long issueId);

        // Issue ID로 조회 (FOR UPDATE - 새 FSM용)
        IssueVO findByIdForUpdate(@Param("issueId") Long issueId);

        // Issue 상태 업데이트
        void updateIssueStatus(IssueVO issueVO);

        // Issue 전체 업데이트 (새 FSM용)
        void updateIssue(IssueVO issueVO);

        // 이미지 저장
        void insertIssueImage(IssueImageVO issueImageVO);

        // AI 판정 초기 저장
        void insertAiJudgment(AiJudgmentVO aiJudgmentVO);

        // AI 판정 결과 업데이트
        void updateAiJudgment(AiJudgmentVO aiJudgmentVO);

        // Issue ID로 AI 판정 조회
        AiJudgmentVO findAiJudgmentByIssueId(@Param("issueId") Long issueId);

        // 관리자 관제 리스트 조회
        java.util.List<IssueDto.AdminIssueSummary> findAdminIssues(
                        @Param("adminId") Long adminId,
                        @Param("req") IssueDto.AdminIssueListRequest req);

        // 관리자 관제 리스트 카운트
        long countAdminIssues(
                        @Param("adminId") Long adminId,
                        @Param("req") IssueDto.AdminIssueListRequest req);

        // 내 이슈 목록 조회
        List<IssueDto.MyIssueSummary> findMyIssues(
                        @Param("workerId") Long workerId,
                        @Param("status") IssueStatus status);
}
