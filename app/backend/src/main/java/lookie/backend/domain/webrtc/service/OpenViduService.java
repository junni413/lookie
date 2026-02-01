package lookie.backend.domain.webrtc.service;

import io.openvidu.java.client.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.dto.WebRtcDto;
import lookie.backend.domain.webrtc.mapper.CallHistoryMapper;
import lookie.backend.domain.webrtc.vo.CallHistoryVO;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.TimeUnit;
import lookie.backend.domain.webrtc.event.CallEndedEvent;
import lookie.backend.domain.webrtc.event.CallRejectedEvent;
import org.springframework.context.ApplicationEventPublisher;


@Slf4j
@Service
@RequiredArgsConstructor
public class OpenViduService {

    private final OpenVidu openVidu;
    private final StringRedisTemplate redisTemplate;
    private final CallHistoryMapper callHistoryMapper;
    private final ApplicationEventPublisher eventPublisher; // 이벤트 발행기 주입
    private static final String USER_STATUS_KEY = "user:status:";
    private static final String STATUS_BUSY = "BUSY";

    /**
     * 1. 화상 요청 (전화 걸기)
     */
    @Transactional
    public WebRtcDto.CallResponse makeCall(WebRtcDto.CallRequest request) throws OpenViduJavaClientException, OpenViduHttpException {

        // 1. [변경] 받는 사람 상태 검증 (통화 중, 자리 비움 등 체크)
        validateUserAvailable(request.getCalleeId());

        // 2. OpenVidu 세션 생성
        SessionProperties properties = new SessionProperties.Builder().build();
        Session session = openVidu.createSession(properties);

        // 3. [MyBatis] VO 생성 및 DB 저장
        CallHistoryVO call = CallHistoryVO.builder()
                .openViduSessionId(session.getSessionId())
                .callerId(request.getCallerId())
                .calleeId(request.getCalleeId())
                .issueId(request.getIssueId())
                .status("WAITING")
                .build();

        callHistoryMapper.save(call);

        // 4. Redis 상태 설정 (받는 사람 BUSY)
        setUserBusy(request.getCalleeId());

        // 5. 거는 사람(Caller)용 토큰 발급
        ConnectionProperties connectionProperties = new ConnectionProperties.Builder()
                .type(ConnectionType.WEBRTC)
                .role(OpenViduRole.PUBLISHER)
                .build();
        String token = session.createConnection(connectionProperties).getToken();

        return new WebRtcDto.CallResponse(call.getId(), session.getSessionId(), token);
    }

    /**
     * 2. 화상 수락 (전화 받기)
     */
    @Transactional
    public String acceptCall(Long callId) throws OpenViduJavaClientException, OpenViduHttpException {
        // 1. 조회
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        // 2. 상태 검증
        if (!"WAITING".equals(call.getStatus())) {
            throw new ApiException(ErrorCode.WEBRTC_CLIENT_ERROR, "대기 중인 통화가 아닙니다.");
        }

        // 3. [MyBatis] 상태 업데이트 (Active)
        call.updateStatus("ACTIVE");
        callHistoryMapper.update(call);

        // 4. OpenVidu 세션 가져오기 & 토큰 발급
        Session session = openVidu.getActiveSession(call.getOpenViduSessionId());
        if (session == null) {
            throw new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND);
        }

        ConnectionProperties connectionProperties = new ConnectionProperties.Builder()
                .type(ConnectionType.WEBRTC)
                .role(OpenViduRole.PUBLISHER)
                .build();

        return session.createConnection(connectionProperties).getToken();
    }

    /**
     * 3. 화상 거절
     */
    @Transactional
    public void rejectCall(Long callId) {
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        // [MyBatis] 상태 업데이트 (Rejected)
        call.updateStatus("REJECTED");
        callHistoryMapper.update(call);

        // [Event 발행] "통화가 거절됨"을 알림 (이슈 로직 분리)
        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallRejectedEvent(
                    call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId()
            ));
        }

        // 리소스 정리
        clearUserStatus(call.getCalleeId());
        closeSessionInternal(call.getOpenViduSessionId());
    }

    /**
     * 4. 화상 종료
     */
    @Transactional
    public void endCall(Long callId) {
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        // [MyBatis] 상태 업데이트 (Ended)
        call.updateStatus("ENDED");
        callHistoryMapper.update(call);

        // [Event 발행] "통화가 정상 종료됨"을 알림 (이슈 로직 분리)
        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallEndedEvent(
                    call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId()
            ));
        }

        // 리소스 정리
        clearUserStatus(call.getCalleeId());
        closeSessionInternal(call.getOpenViduSessionId());
    }

    /**
     * 5. 화상 요청 취소 및 미응답 처리
     */
    @Transactional
    public void cancelCall(Long callId, WebRtcDto.CancelRequest request) {
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        if (!"WAITING".equals(call.getStatus())) {
            throw new ApiException(ErrorCode.WEBRTC_CLIENT_ERROR, "대기 중인 통화만 취소할 수 있습니다.");
        }

        // 사유에 따른 분기 처리
        if ("TIMEOUT".equals(request.getReason())) {
            // 시나리오 1: 30초 동안 안 받음 -> "응답 없음"
            call.updateStatus("NO_ANSWER");

            // [중요] 응답 없음은 "도움 요청 실패"이므로 긴급도 격상 이벤트 발행
            if (call.getIssueId() != null) {
                // 기존 Rejected 이벤트나 새로운 NoAnswer 이벤트를 사용
                eventPublisher.publishEvent(new CallRejectedEvent(
                        call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId()
                ));
            }

        } else {
            // 시나리오 2: 잘못 눌러서 취소함 -> "취소됨"
            call.updateStatus("CANCELED");
            // 이슈 업데이트 불필요 (이벤트 발행 안 함)
        }

        callHistoryMapper.update(call);

        // 뒷정리 (공통)
        clearUserStatus(call.getCalleeId());
        closeSessionInternal(call.getOpenViduSessionId());
    }

    // --- 내부 메서드 ---

    private void closeSessionInternal(String sessionId) {
        try {
            Session session = openVidu.getActiveSession(sessionId);
            if (session != null) {
                session.close();
            }
        } catch (Exception e) {
            log.warn("세션 종료 중 오류 (이미 닫혔을 수 있음): {}", e.getMessage());
        }
    }

    // --- Redis 메서드 ---

    /**
     * [변경] 사용자가 '통화 가능(Available)' 상태인지 검증
     * Key가 없음(Null) -> 가능
     * BUSY, AWAY, PAUSED -> 불가능
     */
    private void validateUserAvailable(Long userId) {
        String key = USER_STATUS_KEY + userId;
        String status = redisTemplate.opsForValue().get(key);

        if (status != null) {
            switch (status) {
                case "BUSY":
                    throw new ApiException(ErrorCode.WEBRTC_MANAGER_BUSY);
                case "AWAY":
                    throw new ApiException(ErrorCode.WEBRTC_USER_AWAY);
                case "PAUSED":
                    throw new ApiException(ErrorCode.WEBRTC_USER_PAUSED);
                default:
                    // 알 수 없는 상태도 일단 BUSY로 처리
                    throw new ApiException(ErrorCode.WEBRTC_MANAGER_BUSY);
            }
        }
    }

    private void setUserBusy(Long userId) {
        String key = USER_STATUS_KEY + userId;
        redisTemplate.opsForValue().set(key, STATUS_BUSY, 1, TimeUnit.HOURS);
    }

    private void clearUserStatus(Long userId) {
        String key = USER_STATUS_KEY + userId;
        redisTemplate.delete(key);
    }
}