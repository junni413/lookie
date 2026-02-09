package lookie.backend.domain.webrtc.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.dto.WebRtcDto;
import lookie.backend.domain.webrtc.service.LiveKitService;
import lookie.backend.domain.webrtc.vo.CallHistoryVO;
import lookie.backend.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Slf4j
@RestController
@RequestMapping("/api/webrtc")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "livekit.enabled", havingValue = "true", matchIfMissing = true)
public class WebRtcController {

    private final LiveKitService liveKitService;

    /**
     * 1. 화상 요청 (전화 걸기)
     * POST /api/webrtc
     */
    @Operation(summary = "화상 전화 요청", description = "DB에 통화 기록을 생성하고(WAITING), 거는 사람에게 LiveKit 토큰을 발급합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<WebRtcDto.CallResponse>> makeCall(
            @RequestBody WebRtcDto.CallRequest request) {

        WebRtcDto.CallResponse response = liveKitService.makeCall(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 2. 통화 상태 조회
     * GET /api/webrtc/{callId}
     */
    @Operation(summary = "통화 상태 조회", description = "DB에서 통화 기록을 조회하여 현재 상태와 세부 정보를 반환합니다.")
    @GetMapping("/{callId}")
    public ResponseEntity<ApiResponse<CallHistoryVO>> getCallStatus(@PathVariable Long callId) {
        CallHistoryVO callHistory = liveKitService.getCallStatus(callId);
        return ResponseEntity.ok(ApiResponse.success(callHistory));
    }

    /**
     * 3. 화상 수락 (전화 받기)
     * POST /api/webrtc/{callId}/accept
     */
    @Operation(summary = "화상 전화 수락", description = "대기 중인 전화를 수락하고(ACTIVE), 받는 사람에게 LiveKit 토큰을 발급합니다.")
    @PostMapping("/{callId}/accept")
    public ResponseEntity<ApiResponse<String>> acceptCall(@PathVariable Long callId) {

        String token = liveKitService.acceptCall(callId);
        return ResponseEntity.ok(ApiResponse.success(token));
    }

    /**
     * 4. 화상 거절
     * POST /api/webrtc/{callId}/reject
     */
    @Operation(summary = "화상 전화 거절", description = "전화를 거절하고(REJECTED), 세션을 종료합니다.")
    @PostMapping("/{callId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectCall(@PathVariable Long callId) {
        liveKitService.rejectCall(callId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 5. 화상 종료
     * POST /api/webrtc/{callId}/end
     */
    @Operation(summary = "화상 전화 종료", description = "통화를 종료하고(ENDED), 세션을 닫습니다.")
    @PostMapping("/{callId}/end")
    public ResponseEntity<ApiResponse<Void>> endCall(@PathVariable Long callId) {
        liveKitService.endCall(callId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 6. 화상 요청 취소/미응답
     * POST /api/webrtc/{callId}/cancel
     */
    @Operation(summary = "화상 요청 취소/미응답", description = "reason: 'TIMEOUT'(시간초과) 또는 'MISTAKE'(단순취소)")
    @PostMapping("/{callId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelCall(
            @PathVariable Long callId,
            @RequestBody WebRtcDto.CancelRequest request) {

        liveKitService.cancelCall(callId, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
