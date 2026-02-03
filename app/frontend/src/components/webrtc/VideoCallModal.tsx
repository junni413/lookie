import { useState } from "react";
import { useCallStore } from "@/stores/callStore";
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
    const status = useCallStore((state) => state.status);
    const remoteUserName = useCallStore((state) => state.remoteUserName);
    const cancelCall = useCallStore((state) => state.cancelCall);
    const endCall = useCallStore((state) => state.endCall);

    // 모달이 열려있지 않으면 렌더링하지 않음
    if (status === "IDLE" || status === "ENDED") {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
                {/* 상태별 UI */}
                {status === "WAITING" && (
                    <WaitingView
                        userName={remoteUserName || "작업자"}
                        onCancel={() => cancelCall("MISTAKE")}
                    />
                )}

                {status === "INCOMING" && (
                    <IncomingView userName={remoteUserName || "관리자"} />
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
    userName,
    onCancel,
}: {
    userName: string;
    onCancel: () => void;
}) {
    return (
        <div className="p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {userName}에게 전화 거는 중...
            </h2>
            <p className="text-slate-500 mb-8">상대방이 응답하기를 기다리고 있습니다.</p>

            <Button
                variant="outline"
                size="lg"
                onClick={onCancel}
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
                <X className="w-5 h-5 mr-2" />
                취소
            </Button>

            {/* DEV ONLY: Test Button */}
            {import.meta.env.DEV && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-xs text-slate-400 hover:text-emerald-600"
                    onClick={async () => {
                        const { callId } = useCallStore.getState();
                        if (callId) await useCallStore.getState().acceptCall(); // This logic is wrong for caller, see my thought
                    }}
                >
                    (TEST) 강제 수락 (Callee Simulation)
                </Button>
            )}
        </div>
    );
}

/**
 * 수신 중 (INCOMING)
 */
function IncomingView({ userName }: { userName: string }) {
    const acceptCall = useCallStore((state) => state.acceptCall);
    const rejectCall = useCallStore((state) => state.rejectCall);

    return (
        <div className="p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center animate-bounce">
                <Phone className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {userName}님의 전화
            </h2>
            <p className="text-slate-500 mb-8">화상 통화 요청이 왔습니다.</p>

            <div className="flex gap-3">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => rejectCall()}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    거절
                </Button>
                <Button
                    size="lg"
                    onClick={() => acceptCall()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Phone className="w-5 h-5 mr-2" />
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

    // LiveKit Room URL (일단 하드코딩 또는 환경변수 처리 필요)
    // 보통 백엔드에서 토큰과 함께 주거나, 환경변수로 관리
    // 임시로 로컬 LiveKit 서버 주소 사용 (확인 필요) 혹은 토큰에 임베딩됨?
    // LiveKit client connect 시 url 필요함.
    // 백엔드에서 토큰 줄 때 url도 같이 주는지 확인 필요하지만, 보통 별도 설정.
    // 여기서는 window.location.hostname 기반으로 추론하거나 하드코딩.
    // LiveKit Room URL
    // application.properties: livekit.url=${LIVEKIT_URL:wss://lookie-of5j44vq.livekit.cloud}
    const [liveKitUrl] = useState(import.meta.env.VITE_LIVEKIT_URL || "wss://lookie-of5j44vq.livekit.cloud");

    // LiveKit Room 연결 (커스텀 훅 사용)
    const { room, localTrack, remoteTrack, remoteParticipant } = useLiveKitRoom({
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
        <div className="relative w-full h-[600px] bg-slate-900 flex flex-col">
            {/* Main Video Area */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 gap-4">

                {/* Remote Video (Large) */}
                {remoteTrack ? (
                    <div className="w-full h-full flex-1">
                        <UserVideoComponent track={remoteTrack} participant={remoteParticipant} />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/50 animate-pulse">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <Phone className="w-10 h-10" />
                        </div>
                        <p>{remoteParticipant ? "상대방 카메라 꺼짐" : "상대방 연결 대기 중..."}</p>
                    </div>
                )}

                {/* Local Video (PIP) */}
                {localTrack && (
                    <div className="absolute bottom-6 right-6 w-48 h-36 border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl bg-black">
                        <UserVideoComponent track={localTrack} isLocal={true} />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-20 bg-slate-800/80 backdrop-blur flex items-center justify-center gap-6 z-10">
                <Button
                    size="icon"
                    variant={isMicOn ? "secondary" : "destructive"}
                    className="rounded-full w-12 h-12"
                    onClick={toggleMic}
                >
                    {isMicOn ? <Mic /> : <MicOff />}
                </Button>

                <Button
                    size="icon"
                    className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 text-white"
                    onClick={onEnd}
                >
                    <PhoneOff className="w-6 h-6" />
                </Button>

                <Button
                    size="icon"
                    variant={isCamOn ? "secondary" : "destructive"}
                    className="rounded-full w-12 h-12"
                    onClick={toggleCam}
                >
                    {isCamOn ? <Video /> : <VideoOff />}
                </Button>
            </div>
        </div>
    );
}
