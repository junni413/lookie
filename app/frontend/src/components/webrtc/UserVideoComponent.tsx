import { useEffect, useRef } from "react";
import type { VideoTrack, Participant } from "livekit-client";

interface UserVideoComponentProps {
    track?: VideoTrack;
    participant?: Participant; // 이름 표시용
    isLocal?: boolean;
}

export default function UserVideoComponent({
    track,
    participant,
    isLocal = false,
}: UserVideoComponentProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (track && videoElement) {
            track.attach(videoElement);
        }

        return () => {
            if (track && videoElement) {
                track.detach(videoElement);
            }
        };
    }, [track]);

    return (
        <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700">
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                // Chrome 정책상 로컬 비디오는 muted여야 자동 재생 가능할 수 있음, 
                // 하지만 LiveKit은 attach 시 처리해줌. 로컬인 경우 mirror 처리.
                style={{ transform: isLocal ? "scaleX(-1)" : "none" }}
            />

            {!track && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <p>비디오 없음</p>
                </div>
            )}

            {/* Name Tag */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                {participant?.identity || participant?.name || "사용자"}
                {isLocal && <span className="text-[10px] bg-slate-500 px-1.5 rounded-sm">나</span>}
            </div>
        </div>
    );
}
