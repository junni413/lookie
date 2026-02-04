package lookie.backend.domain.issue.service;

import lookie.backend.domain.issue.dto.IssueStatus;
import lookie.backend.domain.issue.dto.MyIssueSummary;
import lookie.backend.domain.issue.mapper.IssueMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IssueServiceMyListTest {

    @Mock
    private IssueMapper issueMapper;

    @InjectMocks
    private IssueService issueService;

    @Test
    @DisplayName("내 이슈 목록 조회 - 전체 조회 성공")
    void getMyIssueList_All_Success() {
        // given
        Long workerId = 1L;
        IssueStatus status = null;

        MyIssueSummary summary1 = MyIssueSummary.builder()
                .issueId(1L)
                .issueType("DAMAGED")
                .status("OPEN")
                .productName("Product A")
                .locationCode("A-01-01")
                .aiDecision("PASS")
                .adminRequired(true)
                .createdAt(LocalDateTime.now())
                .build();

        MyIssueSummary summary2 = MyIssueSummary.builder()
                .issueId(2L)
                .issueType("OUT_OF_STOCK")
                .status("RESOLVED")
                .productName("Product B")
                .locationCode("B-02-02")
                .aiDecision("FAIL")
                .adminRequired(false)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        List<MyIssueSummary> expectedList = Arrays.asList(summary1, summary2);

        when(issueMapper.findMyIssues(workerId, status)).thenReturn(expectedList);

        // when
        List<MyIssueSummary> result = issueService.getMyIssueList(workerId, status);

        // then
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Product A", result.get(0).getProductName());
        verify(issueMapper).findMyIssues(workerId, status);
    }

    @Test
    @DisplayName("내 이슈 목록 조회 - 특정 상태 필터링 성공")
    void getMyIssueList_Filtered_Success() {
        // given
        Long workerId = 1L;
        IssueStatus status = IssueStatus.OPEN;

        MyIssueSummary summary = MyIssueSummary.builder()
                .issueId(1L)
                .issueType("DAMAGED")
                .status("OPEN")
                .productName("Product A")
                .build();

        when(issueMapper.findMyIssues(workerId, status)).thenReturn(Collections.singletonList(summary));

        // when
        List<MyIssueSummary> result = issueService.getMyIssueList(workerId, status);

        // then
        assertEquals(1, result.size());
        assertEquals("OPEN", result.get(0).getStatus());
        verify(issueMapper).findMyIssues(workerId, status);
    }
}
