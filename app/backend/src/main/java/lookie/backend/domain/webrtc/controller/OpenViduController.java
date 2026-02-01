package lookie.backend.domain.webrtc.controller;

import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.dto.WebRtcDto;
import lookie.backend.domain.webrtc.service.OpenViduService;
import lookie.backend.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/webrtc")
@RequiredArgsConstructor
public class OpenViduController {

    private final OpenViduService openViduService;

    /**
     * 1. 화상 요청 (전화 걸기)
     * POST /api/webrtc
     */
    @Operation(summary = "화상 전화 요청", description = "DB에 통화 기록을 생성하고(WAITING), 거는 사람에게 토큰을 발급합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<WebRtcDto.CallResponse>> makeCall(
            @RequestBody WebRtcDto.CallRequest request) throws OpenViduJavaClientException, OpenViduHttpException {

        WebRtcDto.CallResponse response = openViduService.makeCall(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 2. 화상 수락 (전화 받기)
     * POST /api/webrtc/{callId}/accept
     */
    @Operation(summary = "화상 전화 수락", description = "대기 중인 전화를 수락하고(ACTIVE), 받는 사람에게 토큰을 발급합니다.")
    @PostMapping("/{callId}/accept")
    public ResponseEntity<ApiResponse<String>> acceptCall(@PathVariable Long callId)
            throws OpenViduJavaClientException, OpenViduHttpException {

        String token = openViduService.acceptCall(callId);
        // 토큰만 간단히 String으로 리턴하거나, DTO로 감싸도 됩니다. (여기선 String Data)
        return ResponseEntity.ok(ApiResponse.success(token));
    }

    /**
     * 3. 화상 거절
     * POST /api/webrtc/{callId}/reject
     */
    @Operation(summary = "화상 전화 거절", description = "전화를 거절하고(REJECTED), 세션을 종료합니다.")
    @PostMapping("/{callId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectCall(@PathVariable Long callId) {
        openViduService.rejectCall(callId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 4. 화상 종료
     * POST /api/webrtc/{callId}/end
     */
    @Operation(summary = "화상 전화 종료", description = "통화를 종료하고(ENDED), 세션을 닫습니다.")
    @PostMapping("/{callId}/end")
    public ResponseEntity<ApiResponse<Void>> endCall(@PathVariable Long callId) {
        openViduService.endCall(callId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}