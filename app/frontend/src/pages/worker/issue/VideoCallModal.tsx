import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff } from "lucide-react";

interface VideoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VideoCallModal({ isOpen, onClose }: VideoCallModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const startCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user" },
                    audio: true,
                });

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setError("카메라 접근 권한이 필요합니다.");
            }
        };

        startCall();

        // Cleanup on unmount or close
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
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
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-300">
            {/* Video Stream */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
            />

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-4">
                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition ${isMuted ? "bg-gray-700" : "bg-white/20 backdrop-blur-sm"
                        }`}
                >
                    {isMuted ? (
                        <MicOff className="h-6 w-6 text-white" />
                    ) : (
                        <Mic className="h-6 w-6 text-white" />
                    )}
                </button>

                {/* End Call Button */}
                <button
                    onClick={endCall}
                    className="flex h-14 items-center gap-2 rounded-full bg-red-600 px-8 font-semibold text-white shadow-lg hover:bg-red-700 transition"
                >
                    <PhoneOff className="h-5 w-5" />
                    <span>통화 종료</span>
                </button>
            </div>

            {/* Call Info */}
            <div className="absolute top-8 left-0 right-0 text-center">
                <div className="inline-block rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-white">관리자와 연결 중...</p>
                </div>
            </div>
        </div>
    );
}
