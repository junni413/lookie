import type {
    CallRequest,
    CallResponse,
    CancelRequest,
    ApiResponse,
} from "@/types/webrtc";

const API_BASE = "/api/webrtc";

/**
 * WebRTC API 서비스
 * 백엔드 OpenViduController와 1:1 매핑
 */
export const webrtcService = {
    /**
     * 1. 화상 전화 요청 (전화 걸기)
     * POST /api/webrtc
     */
    makeCall: async (request: CallRequest): Promise<CallResponse> => {
        console.log("📞 [WebRTC] 통화 요청:", request);

        const response = await fetch(API_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        console.log("📡 [WebRTC] 응답 상태:", response.status, response.statusText);

        if (!response.ok) {
            const error = await response.json();
            console.error("❌ [WebRTC] 에러:", error);
            throw new Error(error.errorCode || "WEBRTC_CALL_FAILED");
        }

        const result: ApiResponse<CallResponse> = await response.json();
        console.log("✅ [WebRTC] 성공:", result.data);
        return result.data;
    },

    /**
     * 2. 통화 상태 조회
     * GET /api/webrtc/{callId}
     */
    checkCallStatus: async (callId: number): Promise<string> => {
        const response = await fetch(`${API_BASE}/${callId}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("WEBRTC_STATUS_CHECK_FAILED");
        }

        const result: ApiResponse<{ status: string }> = await response.json();
        return result.data.status;
    },

    /**
     * 3. 화상 전화 수락
     * POST /api/webrtc/{callId}/accept
     */
    acceptCall: async (callId: number): Promise<string> => {
        const response = await fetch(`${API_BASE}/${callId}/accept`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("WEBRTC_ACCEPT_FAILED");
        }

        const result: ApiResponse<string> = await response.json();
        return result.data;
    },

    /**
     * 4. 화상 전화 거절
     * POST /api/webrtc/{callId}/reject
     */
    rejectCall: async (callId: number): Promise<void> => {
        const response = await fetch(`${API_BASE}/${callId}/reject`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("WEBRTC_REJECT_FAILED");
        }
    },

    /**
     * 5. 화상 전화 종료
     * POST /api/webrtc/{callId}/end
     */
    endCall: async (callId: number): Promise<void> => {
        const response = await fetch(`${API_BASE}/${callId}/end`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("WEBRTC_END_FAILED");
        }
    },

    /**
     * 6. 화상 요청 취소
     * POST /api/webrtc/{callId}/cancel
     */
    cancelCall: async (
        callId: number,
        request: CancelRequest
    ): Promise<void> => {
        console.log(`🚫 [WebRTC] 통화 취소 (callId: ${callId}):`, request);

        const response = await fetch(`${API_BASE}/${callId}/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            console.error("❌ [WebRTC] 취소 실패:", response.status);
            throw new Error("WEBRTC_CANCEL_FAILED");
        }

        console.log("✅ [WebRTC] 취소 완료");
    },
};
