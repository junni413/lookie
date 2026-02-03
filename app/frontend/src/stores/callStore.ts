import { create } from "zustand";
import type { CallState } from "@/types/webrtc";
import { webrtcService } from "@/services/webrtcService";
import { subscribeCallStatus } from "@/services/stompService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/toast";

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
     * - WebSocket 실패 시 폴링 fallback
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

            let pollingInterval: number | null = null;

            const unsubscribe = subscribeCallStatus(
                response.callId,
                token,
                (event) => {
                    console.log(`📨 [WebSocket] 상태 이벤트 수신:`, event);

                    // WebSocket이 작동하면 폴링 중지 (ACCEPTED 시에만)
                    if (event.type === 'ACCEPTED' && pollingInterval) {
                        clearInterval(pollingInterval);
                        pollingInterval = null;
                        console.log("✅ [Polling] WebSocket 연결됨, 폴링 중지");
                    }

                    switch (event.type) {
                        case 'ACCEPTED':
                            console.log("✅ 통화 수락됨! ACTIVE 상태로 전환");
                            toast.success("통화가 연결되었습니다.");

                            // 타이머 해제
                            const { timeoutId } = get();
                            if (timeoutId) clearTimeout(timeoutId);

                            set({
                                status: "ACTIVE",
                                timeoutId: null,
                            });

                            // ACTIVE 상태가 되면 폴링 시작 (종료 감지용)
                            if (!pollingInterval) {
                                console.log("🔄 [Polling] ACTIVE 상태 - 종료 감지를 위한 폴링 시작");
                                pollingInterval = setInterval(async () => {
                                    try {
                                        const callStatus = await webrtcService.checkCallStatus(response.callId);
                                        console.log(`🔄 [Polling] 상태 조회: ${callStatus}`);

                                        if (["REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(callStatus)) {
                                            console.log(`🚫 [Polling] 통화 종료 감지: ${callStatus}`);

                                            // 상태별 토스트 메시지
                                            if (callStatus === "ENDED") {
                                                toast.info("통화가 종료되었습니다.");
                                            } else if (callStatus === "REJECTED") {
                                                toast.warning("통화가 거절되었습니다.");
                                            } else if (callStatus === "CANCELED") {
                                                toast.info("통화가 취소되었습니다.");
                                            } else if (callStatus === "NO_ANSWER") {
                                                toast.warning("응답이 없습니다.");
                                            }

                                            get().reset();
                                            if (pollingInterval) clearInterval(pollingInterval);
                                        }
                                    } catch (err) {
                                        console.error("❌ [Polling] 상태 조회 실패:", err);
                                    }
                                }, 2000) as unknown as number;
                            }
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

                    // WebSocket 실패 시 폴링 시작 (fallback)
                    if (!pollingInterval) {
                        console.log("🔄 [Polling] WebSocket 실패, 폴링 시작 (2초 간격)");
                        pollingInterval = setInterval(async () => {
                            try {
                                const callStatus = await webrtcService.checkCallStatus(response.callId);
                                console.log(`🔄 [Polling] 상태 조회: ${callStatus}`);

                                if (callStatus === "ACTIVE") {
                                    console.log("✅ [Polling] 통화 수락 감지");
                                    const { timeoutId } = get();
                                    if (timeoutId) clearTimeout(timeoutId);
                                    set({ status: "ACTIVE", timeoutId: null });
                                    if (pollingInterval) clearInterval(pollingInterval);
                                } else if (["REJECTED", "ENDED", "CANCELED", "NO_ANSWER"].includes(callStatus)) {
                                    console.log(`🚫 [Polling] 통화 종료 감지: ${callStatus}`);
                                    get().reset();
                                    if (pollingInterval) clearInterval(pollingInterval);
                                }
                            } catch (err) {
                                console.error("❌ [Polling] 상태 조회 실패:", err);
                            }
                        }, 2000) as unknown as number;
                    }
                }
            );

            // Cleanup 함수 저장
            // @ts-ignore
            (get() as any).wsCleanup = () => {
                unsubscribe();
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    console.log("🛑 [Polling] 폴링 중지");
                }
            };

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
     * 409 Conflict 및 기타 WebRTC 에러 처리
     */
    handleError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // WebRTC 에러 코드 매핑 (백엔드 ErrorCode.java 기준)
        const errorMap: Record<string, string> = {
            // 409 Conflict 에러들
            RTC_002: "상대방이 현재 통화할 수 없는 상태입니다.",
            WEBRTC_MANAGER_BUSY: "상대방이 통화 중입니다.",
            RTC_005: "상대방이 자리 비움 상태입니다.",
            WEBRTC_USER_AWAY: "상대방이 자리 비움 상태입니다.",
            RTC_006: "상대방이 작업 중지 상태입니다.",
            WEBRTC_USER_PAUSED: "상대방이 작업 중지 상태입니다.",

            // 기타 에러들
            RTC_001: "통화 세션을 찾을 수 없습니다.",
            WEBRTC_SESSION_NOT_FOUND: "통화 세션을 찾을 수 없습니다.",
            RTC_003: "서버 오류가 발생했습니다.",
            WEBRTC_SERVER_ERROR: "서버 오류가 발생했습니다.",
            RTC_004: "잘못된 요청입니다.",
            WEBRTC_CLIENT_ERROR: "잘못된 요청입니다.",
        };

        const message = errorMap[errorMessage] || "통화 연결에 실패했습니다.";

        console.error("❌ WebRTC Error:", message);
        toast.error(message);

        get().reset();
    },
}));
