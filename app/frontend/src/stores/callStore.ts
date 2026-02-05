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
}

const initialCallSessionState: Omit<CallStore, 'startCall' | 'cancelCall' | 'acceptCall' | 'rejectCall' | 'endCall' | 'reset' | 'handleError' | 'listenForIncomingCalls' | 'timeoutId' | 'incomingCleanup'> = {
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
function showCallStatusToast(status: string) {
    const messages: Record<string, () => void> = {
        ENDED: () => toast.info("통화가 종료되었습니다."),
        REJECTED: () => toast.warning("통화가 거절되었습니다."),
        CANCELED: () => toast.info("통화가 취소되었습니다."),
        NO_ANSWER: () => toast.warning("응답이 없습니다."),
    };

    messages[status]?.();
}

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

    startCall: async (callerId, calleeId, issueId, calleeName) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) throw new Error("인증 토큰이 없습니다.");

            const response = await webrtcService.makeCall({ callerId, calleeId, issueId });

            // 30초 타이머
            const timerId = window.setTimeout(() => {
                console.log("⏰ [Timer] 30초 타임아웃");
                get().cancelCall("TIMEOUT");
            }, 30000);

            // WebSocket 구독
            const unsubscribe = subscribeCallStatus(
                response.callId,
                token,
                (event) => {
                    console.log(`📨 [WebSocket] 이벤트:`, event);

                    switch (event.type) {
                        case 'ACCEPTED':
                            console.log("✅ 통화 수락됨");
                            toast.success("통화가 연결되었습니다.");

                            const { timeoutId } = get();
                            if (timeoutId) clearTimeout(timeoutId);

                            set({ status: "ACTIVE", timeoutId: null });

                            // ACTIVE 후 폴링 시작 (종료 감지용)
                            startPolling(response.callId, (status) => {
                                if (["REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(status)) {
                                    console.log(`🚫 [Polling] 통화 종료: ${status}`);
                                    showCallStatusToast(status);
                                    get().reset();
                                }
                            });
                            break;

                        case 'ENDED':
                            console.log("🚫 통화 종료됨");
                            toast.info("통화가 종료되었습니다.");
                            get().reset();
                            break;

                        case 'REJECTED':
                            console.log("🚫 통화 거절됨");
                            toast.warning("통화가 거절되었습니다.");
                            get().reset();
                            break;

                        case 'CANCELED':
                            console.log("🚫 통화 취소됨");
                            toast.info("통화가 취소되었습니다.");
                            get().reset();
                            break;
                    }
                },
                (error) => {
                    console.error("❌ [WebSocket] 연결 실패:", error);

                    // WebSocket 실패 시 폴링 fallback
                    startPolling(response.callId, (status) => {
                        if (status === "ACTIVE") {
                            console.log("✅ [Polling] 통화 수락 감지");
                            toast.success("통화가 연결되었습니다.");

                            const { timeoutId } = get();
                            if (timeoutId) clearTimeout(timeoutId);

                            set({ status: "ACTIVE", timeoutId: null });
                        } else if (["REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(status)) {
                            console.log(`🚫 [Polling] 통화 종료: ${status}`);
                            showCallStatusToast(status);
                            get().reset();
                        }
                    });
                }
            );

            // Cleanup 함수 저장 (Type Safe)
            set({
                wsCleanup: () => {
                    unsubscribe();
                    stopPolling();
                }
            });

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

    cancelCall: async (reason) => {
        const { callId, timeoutId } = get();
        if (!callId) return;

        if (timeoutId) clearTimeout(timeoutId);

        try {
            await webrtcService.cancelCall(callId, { reason });
            set({ ...initialCallSessionState, timeoutId: null });
        } catch (error) {
            console.error("통화 취소 실패:", error);
            set({ ...initialCallSessionState, timeoutId: null });
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
            set({ ...initialCallSessionState, timeoutId: null });
        } catch (error) {
            console.error("통화 거절 실패:", error);
            set({ ...initialCallSessionState, timeoutId: null });
        }
    },

    endCall: async () => {
        const { callId } = get();
        if (!callId) return;

        try {
            await webrtcService.endCall(callId);
            set({ ...initialCallSessionState, timeoutId: null });
        } catch (error) {
            console.error("통화 종료 실패:", error);
            set({ ...initialCallSessionState, timeoutId: null });
        }
    },

    reset: () => {
        const { timeoutId, wsCleanup } = get();
        if (timeoutId) clearTimeout(timeoutId);

        // WebSocket & Polling Cleanup
        if (wsCleanup) {
            wsCleanup();
        }

        set({ ...initialCallSessionState, timeoutId: null });
    },

    handleError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);

        const errorMap: Record<string, string> = {
            RTC_001: "통화 세션을 찾을 수 없습니다.",
            RTC_002: "상대방이 현재 통화할 수 없는 상태입니다.",
            RTC_003: "서버 오류가 발생했습니다.",
            RTC_004: "잘못된 요청입니다.",
            RTC_005: "상대방이 자리 비움 상태입니다.",
            RTC_006: "상대방이 작업 중지 상태입니다.",
        };

        const message = errorMap[errorMessage] || "통화 연결에 실패했습니다.";

        console.error("❌ WebRTC Error:", message);
        toast.error(message);

        get().reset();
    },

    listenForIncomingCalls: () => {
        const authStore = useAuthStore.getState();
        if (!authStore.token || !authStore.user) return;

        // Cleanup previous subscription if any
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
            } else if (event.type === 'CANCELED') {
                console.warn("🚫 [CallStore] 'CANCELED' event received. Resetting state.");
                toast.info("상대방이 통화를 취소했습니다.");
                set({ ...initialCallSessionState });
            } else if (event.type === 'ENDED') {
                console.warn("🚫 [CallStore] 'ENDED' event received via global listener. Resetting state.");
                toast.info("통화가 종료되었습니다.");
                set({ ...initialCallSessionState });
            }
        });

        set({ incomingCleanup: cleanup });
    }
}));