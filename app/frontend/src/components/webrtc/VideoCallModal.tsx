import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCallStore } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";

import {
    Phone,
    PhoneOff,
    X,
    Mic,
    MicOff,
    Video,
    VideoOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import UserVideoComponent from "./UserVideoComponent";


export default function VideoCallModal() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const status = useCallStore((state) => state.status);
    const issueId = useCallStore((state) => state.issueId);

    const cancelCall = useCallStore((state) => state.cancelCall);
    const endCall = useCallStore((state) => state.endCall);

    // 이전 상태와 issueId를 추적하기 위한 ref
    const prevStatusRef = useRef(status);
    const lastIssueIdRef = useRef(issueId);

    // issueId가 있을 때만 업데이트 (IDLE로 갈 때 null 방지)
    useEffect(() => {
        if (issueId) {
            lastIssueIdRef.current = issueId;
        }
    }, [issueId]);

    // 통화 종료 이벤트 감지 및 리다이렉트
    useEffect(() => {
        const isEnding = (prevStatusRef.current === "ACTIVE" || prevStatusRef.current === "WAITING" || prevStatusRef.current === "INCOMING") &&
            (status === "IDLE" || status === "ENDED");

        if (isEnding && user?.role === "ADMIN" && lastIssueIdRef.current) {
            console.log(`🚀 [Redirect] Redirecting Admin to Issue Detail: ${lastIssueIdRef.current}`);
            navigate(`/admin/issue?issueId=${lastIssueIdRef.current}`);
            lastIssueIdRef.current = null; // 중복 리다이렉트 방지
        }

        prevStatusRef.current = status;
    }, [status, user, navigate]);

    // 모달이 열려있지 않으면 렌더링하지 않음
    if (status === "IDLE" || status === "ENDED") {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 px-4">
            <div className="relative bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl w-[420px] overflow-hidden border border-white/50 ring-1 ring-black/5">
                {/* 상태별 UI */}
                {status === "WAITING" && (
                    <WaitingView
                        onCancel={() => cancelCall("MISTAKE")}
                    />
                )}

                {status === "INCOMING" && (
                    <IncomingView />
                )}

                {status === "ACTIVE" && (
                    <ActiveView
                        onEnd={() => endCall()}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * 발신 대기 중 (WAITING)
 */
function WaitingView({
    onCancel,
}: {
    onCancel: () => void;
}) {
    return (
        <div className="relative h-full p-10 flex flex-col items-center justify-center overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-white/50" />

            {/* Ripple Animation */}
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-[#304FFF] rounded-full animate-ping opacity-20 duration-1000"></div>
                <div className="absolute inset-0 bg-[#304FFF] rounded-full animate-ping delay-150 opacity-10 [animation-duration:1500ms]"></div>
                <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl z-10 p-1">
                    <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <Phone className="w-12 h-12 text-[#304FFF] fill-current" />
                    </div>
                </div>
            </div>

            <div className="relative z-10 text-center w-full">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                    전화 연결 중...
                </h2>
                <p className="text-slate-500 text-sm font-medium mb-12">
                    상대방의 응답을 기다리고 있습니다
                </p>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={onCancel}
                    className="w-full max-w-[200px] h-14 rounded-full border-slate-200 text-slate-600 hover:bg-[#304FFF]/5 hover:text-[#304FFF] hover:border-[#304FFF]/30 shadow-sm transition-all text-base font-semibold mx-auto flex items-center justify-center gap-2"
                >
                    <X className="w-5 h-5" />
                    취소하기
                </Button>
            </div>
        </div>
    );
}

/**
 * 수신 중 (INCOMING)
 */
function IncomingView() {
    const acceptCall = useCallStore((state) => state.acceptCall);
    const rejectCall = useCallStore((state) => state.rejectCall);

    return (
        <div className="p-10 text-center flex flex-col items-center bg-gradient-to-b from-white to-[#304FFF]/5">
            <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-[#304FFF] rounded-full animate-ping opacity-20"></div>
                <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-[#304FFF]/10 shadow-2xl">
                    <div className="w-24 h-24 bg-[#304FFF] rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-[#304FFF]/30">
                        <Phone className="w-10 h-10 text-white fill-current" />
                    </div>
                </div>
            </div>

            <span className="inline-block px-3 py-1 bg-[#304FFF]/10 text-[#304FFF] text-xs font-bold rounded-full mb-3 tracking-wide">
                INCOMING CALL
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                화상 전화 요청
            </h2>
            <p className="text-slate-500 text-sm mb-12">
                영상 통화 요청이 들어왔습니다
            </p>

            <div className="flex gap-6 w-full px-4">
                <Button
                    onClick={() => rejectCall()}
                    className="flex-1 h-14 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 shadow-sm transition-all text-base font-semibold"
                >
                    거절
                </Button>
                <Button
                    onClick={() => acceptCall()}
                    className="flex-1 h-14 rounded-2xl bg-[#304FFF] hover:bg-[#304FFF]/90 text-white shadow-lg shadow-[#304FFF]/30 hover:shadow-xl transition-all text-base font-semibold"
                >
                    수락
                </Button>
            </div>
        </div>
    );
}

/**
 * 통화 중 (ACTIVE) - LiveKit 연결
 */
function ActiveView({
    onEnd,
}: {
    onEnd: () => void;
}) {
    const token = useCallStore((state) => state.token);

    // LiveKit State
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    const [liveKitUrl] = useState(import.meta.env.VITE_LIVEKIT_URL || "wss://lookie-of5j44vq.livekit.cloud");

    // LiveKit Room 연결 (커스텀 훅 사용)
    const { room, localTrack, remoteTrack } = useLiveKitRoom({
        url: liveKitUrl,
        token,
        onConnected: () => {
            console.log('✅ [LiveKit] Room connection established');
        },
        onDisconnected: () => {
            console.log('🚫 [LiveKit] Room disconnected');
        },
        onError: (error: Error) => {
            console.error('❌ [LiveKit] Connection error:', error);
        }
    });

    const toggleMic = async () => {
        if (room?.localParticipant) {
            const newVal = !isMicOn;
            await room.localParticipant.setMicrophoneEnabled(newVal);
            setIsMicOn(newVal);
        }
    };

    const toggleCam = async () => {
        if (room?.localParticipant) {
            const newVal = !isCamOn;
            await room.localParticipant.setCameraEnabled(newVal);
            setIsCamOn(newVal);
            // Note: localTrack is automatically updated by useLiveKitRoom hook
        }
    };

    return (
        <div className="relative w-full h-[640px] bg-slate-900 flex flex-col group">
            {/* Header Gradient */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

            {/* Main Video Area */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-900">
                {/* Remote Video (Large) */}
                {remoteTrack ? (
                    <div className="w-full h-full">
                        <UserVideoComponent track={remoteTrack} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-white/40 animate-pulse">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Phone className="w-10 h-10 opacity-50" />
                        </div>
                        <p className="font-medium">상대방 연결 대기 중...</p>
                    </div>
                )}

                {/* Local Video (PIP) - Draggable feel with shadow */}
                {localTrack && (
                    <div className="absolute top-6 right-6 w-36 h-48 rounded-xl overflow-hidden shadow-2xl bg-zinc-800 z-20">
                        <UserVideoComponent track={localTrack} isLocal={true} />
                    </div>
                )}
            </div>

            {/* Controls Bar - Floating Style */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
                <div className="flex items-center gap-2 px-2 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                    <Button
                        size="icon"
                        variant="ghost"
                        className={`w-12 h-12 rounded-full transition-all ${isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                        onClick={toggleMic}
                    >
                        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>

                    <Button
                        size="icon"
                        className="w-16 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white mx-2 shadow-lg shadow-red-500/20"
                        onClick={onEnd}
                    >
                        <PhoneOff className="w-6 h-6" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className={`w-12 h-12 rounded-full transition-all ${isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                        onClick={toggleCam}
                    >
                        {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
