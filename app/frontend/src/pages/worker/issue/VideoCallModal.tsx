import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, PhoneMissed, Camera, RefreshCw, Send } from "lucide-react";

interface VideoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendToAdmin: () => void;
}

type CallStatus = "CONNECTING" | "CONNECTED" | "NO_ANSWER";

export default function VideoCallModal({ isOpen, onClose, onSendToAdmin }: VideoCallModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<CallStatus>("CONNECTING");

    // Timeout Ref to clear on unmount/retry
    const timeoutRef = useRef<number | null>(null);

    const startCall = async () => {
        try {
            setStatus("CONNECTING");
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: true,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Simulate No Answer after 4 seconds
            timeoutRef.current = window.setTimeout(() => {
                setStatus("NO_ANSWER");
            }, 4000);

        } catch (err) {
            console.error("Camera access denied:", err);
            setError("카메라 접근 권한이 필요합니다.");
        }
    };

    useEffect(() => {
        if (!isOpen) {
            // Reset state when closed
            setStatus("CONNECTING");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        startCall();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isOpen]);

    const endCall = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        onClose();
    };

    const toggleMute = () => {
        if (!streamRef.current) return;
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    };

    const handleRetry = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        startCall();
    };

    if (!isOpen) return null;

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                <div className="rounded-2xl bg-white p-6 text-center">
                    <p className="text-sm font-semibold text-red-600">{error}</p>
                    <button
                        onClick={onClose}
                        className="mt-4 h-10 rounded-xl bg-gray-600 px-6 font-semibold text-white hover:bg-gray-700"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 animate-in fade-in duration-300">
            {/* Main Content Area */}
            <div className="relative h-full flex flex-col">

                {/* Case 1: Active Camera View (CONNECTING / CONNECTED) */}
                {status !== "NO_ANSWER" && (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover scale-x-[-1]"
                        />
                        {/* Status Badge */}
                        <div className="absolute top-12 left-0 right-0 text-center">
                            <div className="inline-block rounded-full bg-black/50 px-5 py-2 backdrop-blur-md">
                                <p className="text-sm font-semibold text-white">
                                    {status === "CONNECTING" ? "관리자 연결 중..." : "상담 진행 중"}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 px-4">
                            <button
                                onClick={toggleMute}
                                className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition ${isMuted ? "bg-slate-700" : "bg-white/20 backdrop-blur-md"
                                    }`}
                            >
                                {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
                            </button>
                            <button
                                onClick={endCall}
                                className="flex h-14 items-center gap-2 rounded-full bg-red-600 px-8 font-bold text-white shadow-lg hover:bg-red-700"
                            >
                                <PhoneOff className="h-5 w-5" />
                                <span>종료</span>
                            </button>
                        </div>
                    </>
                )}

                {/* Case 2: No Answer UI */}
                {status === "NO_ANSWER" && (
                    <div className="flex px-6 h-full flex-col justify-center items-center text-center bg-slate-50">
                        {/* Red Phone Icon */}
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <PhoneMissed className="h-10 w-10 text-red-500" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">관리자가 응답하지 않습니다</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            잠시 후 다시 시도하거나,<br />
                            사진과 함께 메세지를 남겨주세요.
                        </p>

                        {/* Photo Attachment Preview Mock */}
                        <div className="mt-8 flex w-full items-center gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700">
                                <Camera className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-emerald-900">사진 첨부됨</p>
                                <p className="text-xs text-emerald-700/80">촬영한 사진이 함께 전송됩니다.</p>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="mt-10 w-full space-y-3">
                            <button
                                onClick={handleRetry}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-slate-700 border border-slate-200 shadow-sm active:bg-slate-100"
                            >
                                <RefreshCw className="h-5 w-5" />
                                다시 연결 시도
                            </button>

                            <button
                                onClick={onSendToAdmin}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg active:bg-blue-700"
                            >
                                <Send className="h-5 w-5" />
                                관리자에게 전송
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
