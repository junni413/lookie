package lookie.backend.domain.issue.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("AiJudgmentVO")
public class AiJudgmentVO {
    private Long judgmentId;
    private Long issueId;
    private String imageUrl; // 분석 대상 이미지
    private String aiResult; // JSON String (원본 결과)
    private Float confidence; // 신뢰도
    private String aiDecision; // ENUM('PASS','FAIL','NEED_CHECK','UNKNOWN')
    private String summary; // 요약 설명
    private LocalDateTime createdAt;
}
