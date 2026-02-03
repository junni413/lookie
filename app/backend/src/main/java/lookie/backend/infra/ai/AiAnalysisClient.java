package lookie.backend.infra.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.infra.ai.dto.AiAnalysisRequest;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiAnalysisClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.server.url}")
    private String aiServerUrl;

    /**
     * AI 서버로 이미지 분석 요청 (비동기)
     * - Fire and Forget 방식
     * - 결과는 Webhook으로 수신
     */
    public void requestAnalysis(AiAnalysisRequest request) {
        String url = aiServerUrl + "/predict";

        log.info("[AiAnalysisClient] Sending analysis request to AI Server. url={}, issueId={}, productId={}",
                url, request.getIssueId(), request.getProductId());

        try {
            // POST 요청 (JSON Body)
            // RestTemplate은 객체를 보내면 자동으로 JSON 변환 (MessageConverter)
            // 응답은 무시 (Webhook으로 오므로)
            restTemplate.postForObject(url, request, String.class);

            log.info("[AiAnalysisClient] Request sent successfully. issueId={}", request.getIssueId());
        } catch (Exception e) {
            log.error("[AiAnalysisClient] Failed to send request to AI Server. issueId={}, error={}",
                    request.getIssueId(), e.getMessage(), e);
            // 비동기이므로 예외를 던져도 잡을 곳이 마땅치 않음. 로그만 남김.
            // 필요시 재시도 로직이나 DLQ 처리 추가 가능
        }
    }
}
