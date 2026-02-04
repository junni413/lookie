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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import lookie.backend.domain.webrtc.event.CallEndedEvent;
import lookie.backend.domain.webrtc.event.CallRejectedEvent;
import lookie.backend.domain.webrtc.dto.WebRtcSignalType;
import lookie.backend.domain.webrtc.dto.WebRtcSignalResponse;
import lookie.backend.global.constant.RedisKeyConstants;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "livekit.enabled", havingValue = "true", matchIfMissing = true)
public class LiveKitService {

    // ... (fields remain the same) ...
    private final LiveKitConfig liveKitConfig;
    private final StringRedisTemplate redisTemplate;
    private final CallHistoryMapper callHistoryMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final io.livekit.server.RoomServiceClient roomServiceClient;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String STATUS_BUSY = "BUSY";

    /**
     * [Helper] 트랜잭션 커밋 후 실행 (WebSocket 시그널 분리)
     */
    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            // 트랜잭션이 없으면 바로 실행
            action.run();
        }
    }

    // ... (previous methods) ...

    /**
     * 1. 화상 요청 (전화 걸기)
     */
    @Transactional
    public WebRtcDto.CallResponse makeCall(WebRtcDto.CallRequest request) {
        // ... (validation and DB logic) ...
        validateUserAvailable(request.getCalleeId());
        String roomName = generateRoomName(request.getCallerId(), request.getCalleeId());

        CallHistoryVO call = CallHistoryVO.builder()
                .roomName(roomName)
                .callerId(request.getCallerId())
                .calleeId(request.getCalleeId())
                .issueId(request.getIssueId())
                .status("WAITING")
                .createdAt(LocalDateTime.now())
                .build();

        callHistoryMapper.save(call);
        setUserBusy(request.getCalleeId());
        String token = generateToken(request.getCallerId().toString(), roomName);

        // [Refactored] Single Payload Generation
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(WebRtcSignalType.REQUESTED, call.getId(), null,
                request.getCallerId());

        runAfterCommit(() -> sendDualPathSignal(request.getCalleeId(), payload));

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
        CallHistoryVO call = callHistoryMapper.findById(callId)
                .orElseThrow(() -> new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));

        if (!"WAITING".equals(call.getStatus())) {
            throw new ApiException(ErrorCode.WEBRTC_CLIENT_ERROR, "대기 중인 통화가 아닙니다.");
        }

        call.setStatus("ACTIVE");
        call.setStartTime(LocalDateTime.now());
        callHistoryMapper.update(call);

        String token = generateToken(call.getCalleeId().toString(), call.getRoomName());

        // [Refactored] Single Payload Generation
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(WebRtcSignalType.ACCEPTED, call.getId(),
                call.getRoomName(), call.getCalleeId());

        runAfterCommit(() -> sendSignal(payload));

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

        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallRejectedEvent(
                    call.getId(),
                    call.getIssueId(),
                    call.getCallerId(),
                    call.getCalleeId(),
                    "REJECTED"));
        }

        clearUserStatus(call.getCalleeId());
        closeLiveKitRoom(call.getRoomName());

        // [Refactored] Single Payload Generation (Shared UUID)
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(WebRtcSignalType.REJECTED, call.getId(),
                call.getRoomName(), call.getCalleeId());

        runAfterCommit(() -> {
            // 1. Waiting 중인 Caller가 보고 있는 Call Topic
            sendSignal(payload);

            // 2. 확실한 전달을 위한 User Queue (Dual-Path)
            sendDualPathSignal(call.getCallerId(), payload);
        });
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

        if (call.getIssueId() != null) {
            eventPublisher.publishEvent(new CallEndedEvent(
                    call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId()));
        }

        Long senderId = getCurrentUserId();

        try {
            clearUserStatus(call.getCalleeId());
            closeLiveKitRoom(call.getRoomName());
        } catch (Exception e) {
            log.error("[endCall] 리소스 정리 중 오류 발생: {}", e.getMessage());
        } finally {
            // [Refactored] Single Payload Generation (Shared UUID)
            WebRtcSignalResponse payload = WebRtcSignalResponse.from(WebRtcSignalType.ENDED, call.getId(), null,
                    senderId);

            runAfterCommit(() -> {
                // To Call Topic
                sendSignal(payload);

                // To User Queue (Dual-Path)
                Long targetId = call.getCallerId().equals(senderId) ? call.getCalleeId() : call.getCallerId();
                sendDualPathSignal(targetId, payload);
            });
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

        if ("TIMEOUT".equals(request.getReason())) {
            call.setStatus("NO_ANSWER");
            if (call.getIssueId() != null) {
                eventPublisher.publishEvent(new CallRejectedEvent(
                        call.getId(), call.getIssueId(), call.getCallerId(), call.getCalleeId(), "TIMEOUT"));
            }
        } else {
            call.setStatus("CANCELED");
        }

        callHistoryMapper.update(call);

        clearUserStatus(call.getCalleeId());
        closeLiveKitRoom(call.getRoomName());

        // [Refactored] Single Payload Generation
        WebRtcSignalResponse payload = WebRtcSignalResponse.from(WebRtcSignalType.CANCELED, call.getId(), null,
                call.getCallerId());

        runAfterCommit(() -> sendDualPathSignal(call.getCalleeId(), payload));
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
        String key = RedisKeyConstants.USER_STATUS_KEY + userId;
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
        String key = RedisKeyConstants.USER_STATUS_KEY + userId;
        redisTemplate.opsForValue().set(key, STATUS_BUSY, 10, TimeUnit.MINUTES);
    }

    private void clearUserStatus(Long userId) {
        String key = RedisKeyConstants.USER_STATUS_KEY + userId;
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
     * WebSocket 시그널 전송 공통 메서드 (Legacy Wrapper)
     */
    private void sendSignal(Long callId, WebRtcSignalType type, String roomName, Long senderId) {
        sendSignal(WebRtcSignalResponse.from(type, callId, roomName, senderId));
    }

    /**
     * [Overloaded] WebSocket 시그널 전송 (Direct Payload)
     */
    private void sendSignal(WebRtcSignalResponse payload) {
        messagingTemplate.convertAndSend("/topic/video-calls/" + payload.getCallId(), payload);
        log.info("[WebSocket] Signal sent: callId={}, type={}, senderId={}, msgId={}",
                payload.getCallId(), payload.getType(), payload.getSenderId(), payload.getMessageId());
    }

    /**
     * [Refactored] 사용자에게 확실하게 알림 전송 (Dual-Path Strategy) (Legacy Wrapper)
     */
    private void sendDualPathSignal(Long userId, WebRtcSignalType type, Long callId, String roomName, Long senderId) {
        sendDualPathSignal(userId, WebRtcSignalResponse.from(type, callId, roomName, senderId));
    }

    /**
     * [Overloaded] 사용자에게 확실하게 알림 전송 (Direct Payload)
     */
    private void sendDualPathSignal(Long userId, WebRtcSignalResponse payload) {
        if (userId == null)
            return;
        sendSignalToUser(userId, payload);
        sendSignalToUserTopic(userId, payload);
    }

    /**
     * 특정 사용자에게 1:1 시그널 전송
     * Destination: /user/{userId}/queue/calls
     */
    private void sendSignalToUser(Long userId, WebRtcSignalResponse payload) {
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/calls", payload);
        log.info("[WebSocket] Private Signal sent to User {}: callId={}, type={}, msgId={}",
                userId, payload.getCallId(), payload.getType(), payload.getMessageId());
    }

    /**
     * 특정 사용자에게 Topic으로 시그널 전송 (Fallback)
     * Destination: /topic/calls/{userId}
     */
    private void sendSignalToUserTopic(Long userId, WebRtcSignalResponse payload) {
        messagingTemplate.convertAndSend("/topic/calls/" + userId, payload);
        log.info("[WebSocket] Public Topic Signal sent to User {}: callId={}, type={}, msgId={}",
                userId, payload.getCallId(), payload.getType(), payload.getMessageId());
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
