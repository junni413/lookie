package lookie.backend.domain.webrtc.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.Room;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.dto.WebRtcDto;
import lookie.backend.domain.webrtc.mapper.CallHistoryMapper;
import lookie.backend.domain.webrtc.vo.CallHistoryVO;
import lookie.backend.global.config.LiveKitConfig;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import lookie.backend.domain.webrtc.event.CallEndedEvent;
import lookie.backend.domain.webrtc.event.CallRejectedEvent;

import lookie.backend.domain.webrtc.dto.WebRtcSignalType;
import lookie.backend.domain.webrtc.dto.WebRtcSignalResponse;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "livekit.enabled", havingValue = "true", matchIfMissing = true)
public class LiveKitService {

    private final LiveKitConfig liveKitConfig;
    private final StringRedisTemplate redisTemplate;
    private final CallHistoryMapper callHistoryMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final io.livekit.server.RoomServiceClient roomServiceClient;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String USER_STATUS_KEY = "user:status:";
    private static final String STATUS_BUSY = "BUSY";

    /**
     * 1. 화상 요청 (전화 걸기)
     */
    @Transactional
    public WebRtcDto.CallResponse makeCall(WebRtcDto.CallRequest request) {

        // 1. 받는 사람 상태 검증 (통화 중, 자리 비움 등 체크)
        validateUserAvailable(request.getCalleeId());

        // 2. LiveKit Room 이름 생성 (고유한 이름)
        String roomName = generateRoomName(request.getCallerId(), request.getCalleeId());

        // 3. [MyBatis] VO 생성 및 DB 저장
        CallHistoryVO call = CallHistoryVO.builder()
                .roomName(roomName)
                .callerId(request.getCallerId())
                .calleeId(request.getCalleeId())
                .issueId(request.getIssueId()) // Nullable
                .status("WAITING")
                .createdAt(LocalDateTime.now())
                .build();

        callHistoryMapper.save(call);

        // 4. Redis 상태 설정 (받는 사람 BUSY)
        setUserBusy(request.getCalleeId());

        // 5. 거는 사람(Caller)용 LiveKit 토큰 발급
        String token = generateToken(request.getCallerId().toString(), roomName);

        // 6. [WebSocket] Callee에게 요청 알림 전송 (Dual-Path)
        sendDualPathSignal(request.getCalleeId(), WebRtcSignalType.REQUESTED, call.getId(), null, request.getCallerId());

        return new WebRtcDto.CallResponse(call.getId(), roomName, token);
    }

    /**
     * 2. 통화 상태 조회
     */
    @Transactional(readOnly = true)
    public CallHistoryVO getCallStatus(Long callId) {
        return callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));
    }

    /**
     * 3. 화상 수락 (전화 받기)
     */
    @Transactional
    public String acceptCall(Long callId) {
        // 1. 조회
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        // 2. 상태 검증
        if (!"WAITING".equals(call.getStatus())) {
            throw new ApiException(ErrorCode.WEBRTC_CLIENT_ERROR, "대기 중인 통화가 아닙니다.");
        }

        // 3. 상태 변경
        call.setStatus("ACTIVE");
        call.setStartTime(LocalDateTime.now());
        callHistoryMapper.update(call);

        // 4. 받는 사람(Callee)용 LiveKit 토큰 발급
        String token = generateToken(call.getCalleeId().toString(), call.getRoomName());

        // 5. [WebSocket] Caller에게 수락 알림 전송 (Polling 대체)
        sendSignal(call.getId(), WebRtcSignalType.ACCEPTED, call.getRoomName(), call.getCalleeId());

        return token;
    }

    /**
     * 4. 화상 거절
     */
    @Transactional
    public void rejectCall(Long callId) {
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        call.setStatus("REJECTED");
        callHistoryMapper.update(call);

        // [Event 발행] "통화가 거절됨"
        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallRejectedEvent(
                    call.getId(),
                    call.getIssueId(),
                    call.getCallerId(),
                    call.getCalleeId(),
                    "REJECTED"));
        }

        // 리소스 정리
        clearUserStatus(call.getCalleeId());
        closeLiveKitRoom(call.getRoomName());

        // [WebSocket] Caller에게 거절 알림 전송
        sendSignal(call.getId(), WebRtcSignalType.REJECTED, null, call.getCalleeId());
    }

    /**
     * 5. 화상 종료
     */
    @Transactional
    public void endCall(Long callId) {
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        call.setStatus("ENDED");
        call.setEndTime(LocalDateTime.now());
        callHistoryMapper.update(call);

        // [Event 발행] "통화 정상 종료"
        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallEndedEvent(
                    call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId()));
        }

        Long senderId = getCurrentUserId(); // 현재 종료 요청한 사용자 (없으면 null or 0L)

        try {
            // 리소스 정리 (에러 발생해도 시그널은 가야 함)
            clearUserStatus(call.getCalleeId());
            closeLiveKitRoom(call.getRoomName());
        } catch (Exception e) {
            log.error("[endCall] 리소스 정리 중 오류 발생: {}", e.getMessage());
        } finally {
            // [WebSocket] 통화 종료 알림 전송 (필수 보장)
            sendSignal(call.getId(), WebRtcSignalType.ENDED, null, senderId);
            
            // [추가] 수신자에게도 확실하게 종료 알림 (Dual-Path)
            Long targetId = call.getCallerId().equals(senderId) ? call.getCalleeId() : call.getCallerId();
            sendDualPathSignal(targetId, WebRtcSignalType.ENDED, call.getId(), null, senderId);
        }
    }

    /**
     * 6. 화상 요청 취소 및 미응답 처리
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
            call.setStatus("NO_ANSWER");

            // [중요] 응답 없음은 "도움 요청 실패" -> 긴급도 격상
            if (call.getIssueId() != null) {
                eventPublisher.publishEvent(new CallRejectedEvent(
                        call.getId(),
                        call.getIssueId(),
                        call.getCallerId(),
                        call.getCalleeId(),
                        "TIMEOUT"));
            }

        } else {
            // 시나리오 2: 잘못 눌러서 취소함 -> "취소됨"
            call.setStatus("CANCELED");
        }

        callHistoryMapper.update(call);

        // 뒷정리 (공통)
        clearUserStatus(call.getCalleeId());
        closeLiveKitRoom(call.getRoomName());

        // [WebSocket] Callee에게 취소 알림 전송 (벨소리 중단용)
        sendDualPathSignal(call.getCalleeId(), WebRtcSignalType.CANCELED, call.getId(), null, call.getCallerId());
    }

    // --- 내부 메서드 ---

    /**
     * LiveKit 토큰 생성
     */
    private String generateToken(String identity, String roomName) {
        try {
            AccessToken token = new AccessToken(liveKitConfig.getApiKey(), liveKitConfig.getApiSecret());
            token.setName(identity);
            token.setIdentity(identity);

            // [Security Fix] Token Restrictions
            // Use RoomJoin(true) AND Room(roomName) to restrict access to the specific room
            // only.
            // This is the functional equivalent of configuring VideoGrants with
            // roomJoin=true and room=roomName.
            token.addGrants(new RoomJoin(true), new Room(roomName));

            return token.toJwt();
        } catch (Exception e) {
            log.error("[LiveKit] 토큰 생성 실패: {}", e.getMessage(), e);
            throw new ApiException(ErrorCode.WEBRTC_SERVER_ERROR, "LiveKit 토큰 생성에 실패했습니다.");
        }
    }

    /**
     * Room 이름 생성 (고유성 보장)
     */
    private String generateRoomName(Long callerId, Long calleeId) {
        return String.format("call-%d-%d-%d", callerId, calleeId, System.currentTimeMillis());
    }

    // --- Redis 메서드 ---

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
                    throw new ApiException(ErrorCode.WEBRTC_MANAGER_BUSY);
            }
        }
    }

    private void setUserBusy(Long userId) {
        String key = USER_STATUS_KEY + userId;
        redisTemplate.opsForValue().set(key, STATUS_BUSY, 10, TimeUnit.MINUTES);
    }

    private void clearUserStatus(Long userId) {
        String key = USER_STATUS_KEY + userId;
        redisTemplate.delete(key);
    }

    /**
     * LiveKit Room 삭제 (리소스 정리)
     */
    private void closeLiveKitRoom(String roomName) {
        try {
            // Room 삭제 API 호출
            roomServiceClient.deleteRoom(roomName);
            log.info("[LiveKit] Room 삭제 성공: {}", roomName);
        } catch (Exception e) {
            log.error("[LiveKit] Room 삭제 실패: {}", e.getMessage());
            // Room이 이미 없거나 오류가 발생해도 비즈니스 로직은 계속 진행
        }
    }

    /**
     * WebSocket 시그널 전송 공통 메서드
     * Destination: /topic/video-calls/{callId}
     */
    /**
     * WebSocket 시그널 전송 공통 메서드
     * Destination: /topic/video-calls/{callId}
     */
    private void sendSignal(Long callId, WebRtcSignalType type, String roomName, Long senderId) {
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(type, callId, roomName, senderId);

        messagingTemplate.convertAndSend("/topic/video-calls/" + callId, payload);
        log.info("[WebSocket] Signal sent: callId={}, type={}, senderId={}", callId, type, senderId);
    }

    /**
     * [Refactored] 사용자에게 확실하게 알림 전송 (Dual-Path Strategy)
     * 1. 개인 큐 (/user/{id}/queue/calls)
     * 2. 공용 토픽 (/topic/calls/{id}) - Fallback
     */
    private void sendDualPathSignal(Long userId, WebRtcSignalType type, Long callId, String roomName, Long senderId) {
        if (userId == null) return;
        sendSignalToUser(userId, type, callId, roomName, senderId);
        sendSignalToUserTopic(userId, type, callId, roomName, senderId);
    }

    /**
     * 특정 사용자에게 1:1 시그널 전송
     * Destination: /user/{userId}/queue/calls
     */
    private void sendSignalToUser(Long userId, WebRtcSignalType type, Long callId, String roomName, Long senderId) {
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(type, callId, roomName, senderId);
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/calls", payload);
        log.info("[WebSocket] Private Signal sent to User {}: callId={}, type={}", userId, callId, type);
    }

    /**
     * 특정 사용자에게 Topic으로 시그널 전송 (Fallback)
     * Destination: /topic/calls/{userId}
     */
    private void sendSignalToUserTopic(Long userId, WebRtcSignalType type, Long callId, String roomName, Long senderId) {
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(type, callId, roomName, senderId);
        messagingTemplate.convertAndSend("/topic/calls/" + userId, payload);
        log.info("[WebSocket] Public Topic Signal sent to User {}: callId={}, type={}", userId, callId, type);
    }

    /**
     * SecurityContext에서 현재 사용자 ID 추출
     */
    private Long getCurrentUserId() {
        try {
            String userId = SecurityContextHolder.getContext().getAuthentication().getName();
            return Long.parseLong(userId);
        } catch (Exception e) {
            log.warn("[getCurrentUserId] 사용자 ID 추출 실패: {}", e.getMessage());
            return null;
        }
    }
}
