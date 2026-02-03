import { create } from "zustand";
import type { CallState } from "@/types/webrtc";
import { webrtcService } from "@/services/webrtcService";
import { subscribeCallStatus } from "@/services/stompService";
import { useAuthStore } from "@/stores/authStore";

interface CallStore extends CallState {
    // 타이머 ID (브라우저 환경)
    timeoutId: number | null;

    // Actions
    startCall: (
        callerId: number,
        calleeId: number,
        issueId: number | null,
        calleeName?: string
    ) => Promise<void>;
    cancelCall: (reason: "TIMEOUT" | "MISTAKE") => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    endCall: () => Promise<void>;
    reset: () => void;

    // 에러 핸들러
    handleError: (error: unknown) => void;
}

const initialState: CallState = {
    status: "IDLE",
    callId: null,
    sessionId: null,
    token: null,
    remoteUserId: null,
    remoteUserName: null,
    issueId: null,
};

export const useCallStore = create<CallStore>((set, get) => ({
    ...initialState,
    timeoutId: null,

    /**
     * 통화 시작 (발신)
     * - API 호출
     * - 30초 타이머 시작
     * - WebSocket 구독 시작 (상대방 수락 여부 확인)
     */
    startCall: async (callerId, calleeId, issueId, calleeName) => {
        try {
            const response = await webrtcService.makeCall({
                callerId,
                calleeId,
                issueId,
            });

            // 30초 타이머 시작
            const timerId = setTimeout(() => {
                console.log("⏰ 30초 타임아웃 - 자동 취소");
                get().cancelCall("TIMEOUT");
            }, 30000);

            // STOMP WebSocket 구독 시작
            const token = useAuthStore.getState().token;
            if (!token) {
                console.error("❌ [WebSocket] 토큰이 없습니다. 구독 불가.");
                return;
            }

            const unsubscribe = subscribeCallStatus(
                response.callId,
                token,
                (event) => {
                    console.log(`📨 [WebSocket] 상태 이벤트 수신:`, event);

                    switch (event.type) {
                        case 'ACCEPTED':
                            console.log("✅ 통화 수락됨! ACTIVE 상태로 전환");
                            // 타이머 해제
                            const { timeoutId } = get();
                            if (timeoutId) clearTimeout(timeoutId);

                            set({
                                status: "ACTIVE",
                                timeoutId: null,
                            });
                            break;

                        case 'ENDED':
                            console.log("🚫 통화 종료됨");
                            get().reset();
                            break;

                        case 'REJECTED':
                            console.log("🚫 통화 거절됨");
                            get().reset();
                            break;

                        case 'CANCELED':
                            console.log("🚫 통화 취소됨");
                            get().reset();
                            break;
                    }
                },
                (error) => {
                    console.error("❌ [WebSocket] 연결 실패:", error);
                }
            );

            // Cleanup 함수 저장
            // @ts-ignore
            (get() as any).wsCleanup = unsubscribe;

            set({
                status: "WAITING",
                callId: response.callId,
                sessionId: response.sessionId,
                token: response.token,
                remoteUserId: calleeId,
                remoteUserName: calleeName || "작업자",
                issueId,
                timeoutId: timerId,
            });
        } catch (error) {
            get().handleError(error);
        }
    },

    /**
     * 통화 취소
     */
    cancelCall: async (reason) => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.cancelCall(callId, { reason });
            set({ ...initialState, timeoutId: null });
        } catch (error) {
            console.error("통화 취소 실패:", error);
            set({ ...initialState, timeoutId: null });
        }
    },

    /**
     * 통화 수락
     */
    acceptCall: async () => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            const token = await webrtcService.acceptCall(callId);
            set({
                status: "ACTIVE",
                token,
                timeoutId: null,
            });
        } catch (error) {
            get().handleError(error);
        }
    },

    /**
     * 통화 거절
     */
    rejectCall: async () => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.rejectCall(callId);
            set({ ...initialState, timeoutId: null });
        } catch (error) {
            console.error("통화 거절 실패:", error);
            set({ ...initialState, timeoutId: null });
        }
    },

    /**
     * 통화 종료
     */
    endCall: async () => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.endCall(callId);
            set({ ...initialState, timeoutId: null });
        } catch (error) {
            console.error("통화 종료 실패:", error);
            set({ ...initialState, timeoutId: null });
        }
    },

    /**
     * 상태 초기화
     */
    reset: () => {
        const { timeoutId } = get();
        if (timeoutId) clearTimeout(timeoutId);

        set({ ...initialState, timeoutId: null });

        // WebSocket Cleanup
        const wsCleanup = (get() as any).wsCleanup;
        if (wsCleanup) {
            wsCleanup();
            (get() as any).wsCleanup = null;
        }
    },

    /**
     * 에러 핸들러
     * 409 Conflict 처리
     */
    handleError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 409 에러 메시지 매핑
        const errorMap: Record<string, string> = {
            WEBRTC_MANAGER_BUSY: "상대방이 통화 중입니다.",
            WEBRTC_USER_AWAY: "상대방이 자리 비움 상태입니다.",
            WEBRTC_USER_PAUSED: "상대방이 작업 중지 상태입니다.",
        };

        const message = errorMap[errorMessage] || "통화 연결에 실패했습니다.";

        // TODO: 토스트 메시지 표시 (toast library 추가 필요)
        console.error("❌ WebRTC Error:", message);
        alert(message);

        get().reset();
    },
}));
