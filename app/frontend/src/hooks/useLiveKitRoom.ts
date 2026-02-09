import { useEffect, useState, useRef } from 'react';
import {
    Room,
    RoomEvent,
    Track,
    VideoPresets,
    LocalVideoTrack,
    RemoteVideoTrack,
    RemoteParticipant,
} from 'livekit-client';

interface UseLiveKitRoomOptions {
    url: string;
    token: string | null;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: Error) => void;
}

interface UseLiveKitRoomReturn {
    room: Room | null;
    localTrack: LocalVideoTrack | undefined;
    remoteTrack: RemoteVideoTrack | undefined;
    remoteParticipant: RemoteParticipant | undefined;
    isConnecting: boolean;
    error: Error | null;
}

/**
 * LiveKit Room 연결을 관리하는 커스텀 훅
 * 
 * @param options - LiveKit 연결 옵션
 * @returns Room 상태 및 트랙 정보
 * 
 * @example
 * const { room, localTrack, remoteTrack } = useLiveKitRoom({
 *   url: 'wss://livekit.example.com',
 *   token: 'your-token',
 *   onConnected: () => console.log('Connected!'),
 * });
 */
export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomReturn {
    const { url, token, onConnected, onDisconnected, onError } = options;

    // useRef로 콜백 저장 (의존성 배열에서 제외하기 위함)
    const onConnectedRef = useRef(onConnected);
    const onDisconnectedRef = useRef(onDisconnected);
    const onErrorRef = useRef(onError);

    // 콜백 업데이트
    useEffect(() => {
        onConnectedRef.current = onConnected;
        onDisconnectedRef.current = onDisconnected;
        onErrorRef.current = onError;
    }, [onConnected, onDisconnected, onError]);

    const [room, setRoom] = useState<Room | null>(null);
    const [localTrack, setLocalTrack] = useState<LocalVideoTrack | undefined>();
    const [remoteTrack, setRemoteTrack] = useState<RemoteVideoTrack | undefined>();
    const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | undefined>();
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!token) return;

        let aborted = false;
        setIsConnecting(true);
        setError(null);

        // 1. Create Room
        const newRoom = new Room({
            videoCaptureDefaults: {
                resolution: VideoPresets.h720.resolution,
            },
            adaptiveStream: true,
            dynacast: true,
        });

        setRoom(newRoom);

        // 2. Event Listeners
        newRoom
            .on(RoomEvent.Connected, () => {
                console.log('✅ [LiveKit] Connected to Room:', newRoom.name);
                onConnectedRef.current?.();
            })
            .on(RoomEvent.Disconnected, () => {
                console.log('🚫 [LiveKit] Disconnected');
                onDisconnectedRef.current?.();
            })
            .on(RoomEvent.ParticipantConnected, (participant) => {
                console.log('👤 [LiveKit] Participant Connected:', participant.identity);
                setRemoteParticipant(participant);
            })
            .on(RoomEvent.ParticipantDisconnected, (participant) => {
                console.log('👋 [LiveKit] Participant Left:', participant.identity);
                setRemoteParticipant(undefined);
                setRemoteTrack(undefined);
            })
            .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
                console.log('🎥 [LiveKit] Track Subscribed:', track.kind, participant.identity);
                if (track.kind === Track.Kind.Video) {
                    setRemoteTrack(track as RemoteVideoTrack);
                    setRemoteParticipant(participant);
                }
                if (track.kind === Track.Kind.Audio) {
                    // Audio track must be attached to play
                    track.attach();
                }
            })
            .on(RoomEvent.TrackUnsubscribed, (track) => {
                console.log('❌ [LiveKit] Track Unsubscribed:', track.kind);
                if (track.kind === Track.Kind.Video) {
                    setRemoteTrack(undefined);
                }
                if (track.kind === Track.Kind.Audio) {
                    track.detach();
                }
            })
            .on(RoomEvent.LocalTrackPublished, (publication) => {
                console.log('📤 [LiveKit] Local Track Published:', publication.kind, publication.source);
                if (publication.kind === Track.Kind.Video && publication.source === Track.Source.Camera) {
                    if (publication.track) {
                        setLocalTrack(publication.track as LocalVideoTrack);
                    }
                }
            });

        // 3. Connect
        newRoom
            .connect(url, token)
            .then(async () => {
                if (aborted) return;

                setIsConnecting(false);

                // 4. Publish Local Camera & Mic
                console.log('📸 [LiveKit] Publishing Camera & Mic...');
                await newRoom.localParticipant.enableCameraAndMicrophone();

                // 이미 방에 있는 참가자 확인
                if (newRoom.remoteParticipants.size > 0) {
                    const participant = Array.from(newRoom.remoteParticipants.values())[0];
                    setRemoteParticipant(participant);

                    // 이미 비디오를 켜둔 경우 트랙 찾기
                    participant.trackPublications.forEach((pub) => {
                        if (pub.kind === Track.Kind.Video && pub.track) {
                            setRemoteTrack(pub.track as RemoteVideoTrack);
                        }
                    });
                }
            })
            .catch((e) => {
                if (!aborted) {
                    console.error('❌ [LiveKit] Connection Failed:', e);
                    setError(e);
                    setIsConnecting(false);
                    onErrorRef.current?.(e);
                }
            });

        // Cleanup
        return () => {
            aborted = true;
            newRoom.disconnect();
            setRoom(null);
            setLocalTrack(undefined);
            setRemoteTrack(undefined);
            setRemoteParticipant(undefined);
        };
    }, [url, token]); // 콜백 함수들을 의존성에서 제거!

    return {
        room,
        localTrack,
        remoteTrack,
        remoteParticipant,
        isConnecting,
        error,
    };
}
