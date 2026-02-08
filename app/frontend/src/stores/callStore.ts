import { create } from "zustand";
import type { CallState } from "@/types/webrtc";
import { webrtcService } from "@/services/webrtcService";
import { subscribeCallStatus, subscribeIncomingCalls } from "@/services/stompService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/toast";

interface CallStore extends CallState {
    timeoutId: number | null;
    wsCleanup: (() => void) | null;
    incomingCleanup: (() => void) | null;

    startCall: (
        callerId: number,
        calleeId: number | null,
        issueId: number | null,
        calleeName?: string
    ) => Promise<void>;
    cancelCall: (reason: "TIMEOUT" | "MISTAKE") => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    endCall: () => Promise<void>;
    reset: () => void;
    handleError: (error: unknown) => void;
    listenForIncomingCalls: () => void;
    cleanupSession: () => void;
    handleCallEnd: (status: string, message?: string) => void;
}

const initialCallSessionState: Omit<CallStore, 'startCall' | 'cancelCall' | 'acceptCall' | 'rejectCall' | 'endCall' | 'reset' | 'handleError' | 'listenForIncomingCalls' | 'timeoutId' | 'incomingCleanup' | 'cleanupSession' | 'handleCallEnd'> = {
    status: "IDLE",
    callId: null,
    sessionId: null,
    token: null,
    remoteUserId: null,
    remoteUserName: null,
    issueId: null,
    wsCleanup: null,
};

// 폴링 interval 저장
let pollingInterval: number | null = null;

/**
 * 통화 상태별 토스트 메시지 표시
 */


/**
 * 폴링 시작
 */
function startPolling(callId: number, onStateChange: (status: string) => void) {
    if (pollingInterval) return;

    console.log("🔄 [Polling] 폴링 시작 (2초 간격)");
    pollingInterval = window.setInterval(async () => {
        try {
            const callStatus = await webrtcService.checkCallStatus(callId);
            console.log(`🔄 [Polling] 상태 조회: ${callStatus}`);

            if (["ACTIVE", "REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(callStatus)) {
                onStateChange(callStatus);
            }
        } catch (err) {
            console.error("❌ [Polling] 상태 조회 실패:", err);
        }
    }, 2000);
}

/**
 * 폴링 중지
 */
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("🛑 [Polling] 폴링 중지");
    }
}

export const useCallStore = create<CallStore>((set, get) => ({
    ...initialCallSessionState,
    timeoutId: null,
    incomingCleanup: null,

    cleanupSession: () => {
        const { timeoutId, wsCleanup } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (wsCleanup) wsCleanup();
        set({ ...initialCallSessionState, timeoutId: null });
    },

    handleCallEnd: (status: string, message?: string) => {
        const { status: currentStatus, cleanupSession } = get();

        // 이미 IDLE 상태라면 중복 처리를 방지합니다.
        if (currentStatus === 'IDLE') return;

        // 알림 메시지 표시
        switch (status) {
            case 'ENDED': toast.info(message || "통화가 종료되었습니다."); break;
            case 'REJECTED': toast.warning(message || "통화가 거절되었습니다."); break;
            case 'CANCELED': toast.info(message || "통화가 취소되었습니다."); break;
            case 'NO_ANSWER': toast.warning(message || "응답이 없습니다."); break;
            case 'TIMEOUT': toast.info(message || "응답이 없어 종료되었습니다."); break;
        }

        // 세션 정리 호출
        cleanupSession();
    },

    startCall: async (callerId, calleeId, issueId, calleeName) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) throw new Error("인증 토큰이 없습니다.");

            // [Fix] 통화 요청 전에 상태를 WAITING으로 먼저 변경하여 모달이 즉시 뜨게 함
            set({
                status: "WAITING",
                remoteUserId: calleeId,
                remoteUserName: calleeName || "관리자",
                issueId,
            });

            const response = await webrtcService.makeCall({ callerId, calleeId, issueId });

            const timerId = window.setTimeout(() => {
                console.log("⏰ [Timer] 30초 타임아웃");
                get().cancelCall("TIMEOUT");
            }, 30000);

            const handleStatusChange = (status: string) => {
                if (["REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(status)) {
                    console.log(`🚫 [Polling/WS] 통화 종료: ${status}`);
                    get().handleCallEnd(status);
                } else if (status === 'ACCEPTED') {
                    console.log("✅ 통화 수락됨");
                    toast.success("통화가 연결되었습니다.");
                    const { timeoutId } = get();
                    if (timeoutId) clearTimeout(timeoutId);
                    set({ status: "ACTIVE", timeoutId: null });

                    // Start polling for end
                    startPolling(response.callId, handleStatusChange);
                }
            };

            const unsubscribe = subscribeCallStatus(
                response.callId,
                token,
                (event) => handleStatusChange(event.type),
                (error) => {
                    console.error("❌ [WebSocket] 연결 실패:", error);
                    startPolling(response.callId, handleStatusChange);
                }
            );

            set({
                wsCleanup: () => {
                    unsubscribe();
                    stopPolling();
                }
            });

            // 나머지 정보 업데이트 (status는 이미 WAITING)
            set({
                callId: response.callId,
                sessionId: response.sessionId,
                token: response.token,
                timeoutId: timerId,
            });
        } catch (error) {
            get().handleError(error);
        }
    },

    cancelCall: async (reason) => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.cancelCall(callId, { reason });
            // Local cleanup
            get().cleanupSession();
        } catch (error) {
            console.error("통화 취소 실패:", error);
            get().cleanupSession();
        }
    },

    acceptCall: async () => {
        const { callId, timeoutId } = get();
        if (!callId) return;
        if (timeoutId) clearTimeout(timeoutId);

        try {
            const token = await webrtcService.acceptCall(callId);
            set({ status: "ACTIVE", token, timeoutId: null });
        } catch (error) {
            get().handleError(error);
        }
    },

    rejectCall: async () => {
        const { callId, timeoutId } = get();
        if (!callId) return;
        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.rejectCall(callId);
            get().cleanupSession();
        } catch (error) {
            console.error("통화 거절 실패:", error);
            get().cleanupSession();
        }
    },

    endCall: async () => {
        const { callId } = get();
        if (!callId) return;

        try {
            await webrtcService.endCall(callId);
            get().cleanupSession();
        } catch (error) {
            console.error("통화 종료 실패:", error);
            get().cleanupSession();
        }
    },

    reset: () => {
        get().cleanupSession();
    },

    handleError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMap: Record<string, string> = {
            RTC_001: "통화 세션을 찾을 수 없습니다.",
            RTC_002: "관리자가 현재 부재중이거나 통화 중입니다.",
            RTC_005: "상대방이 자리 비움 상태입니다.",
            RTC_006: "상대방이 작업 중지 상태입니다.",
            WEBRTC_USER_UNAVAILABLE: "상대방이 현재 통화 가능한 상태가 아닙니다.",
        };
        const message = errorMap[errorMessage] || "통화 연결에 실패했습니다.";
        console.error("❌ WebRTC Error:", message);
        toast.error(message);
        get().cleanupSession();
    },

    listenForIncomingCalls: () => {
        const authStore = useAuthStore.getState();
        if (!authStore.token || !authStore.user) return;

        const { incomingCleanup: prevCleanup } = get();
        if (prevCleanup) prevCleanup();

        console.log(`👂 [CallStore] 수신 대기 시작 (User: ${authStore.user.userId})`);

        const cleanup = subscribeIncomingCalls(authStore.token, authStore.user.userId, (event) => {
            console.log("📨 [CallStore] 수신 이벤트:", event);

            if (event.type === 'REQUESTED') {
                set({
                    status: "INCOMING",
                    callId: event.callId,
                    sessionId: undefined,
                    token: undefined,
                    remoteUserId: undefined,
                    remoteUserName: event.reason || "관리자",
                    issueId: null,
                });
            } else if (event.type === 'CANCELED' || event.type === 'ENDED') {
                const { status, wsCleanup } = get();
                // Duplicate check
                if (status === 'IDLE' || wsCleanup) {
                    console.log(`🚫 [CallStore] Ignoring '${event.type}' event (Duplicate or Handled elsewhere)`);
                    return;
                }

                console.warn(`🚫 [CallStore] '${event.type}' event received via global listener.`);
                get().handleCallEnd(event.type);
            }
        });

        set({ incomingCleanup: cleanup });
    }
}));

// [Fix] 로그아웃 시 WebRTC 세션 자동 정리
// useAuthStore의 상태 변화를 구독하여 토큰이 없어지면 세션을 정리합니다.
useAuthStore.subscribe((state, prevState) => {
    if (prevState.token && !state.token) {
        console.log("🔓 [CallStore] Logout detected, cleaning up WebRTC session...");
        useCallStore.getState().cleanupSession();
    }
});
