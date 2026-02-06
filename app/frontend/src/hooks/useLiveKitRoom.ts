import { useEffect, useState, useRef, useCallback } from 'react';
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
    onReconnecting?: () => void;
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
    disconnect: () => Promise<void>;
}

/**
 * LiveKit Room 연결을 관리하는 커스텀 훅 (Refactored for Stability & Idempotency)
 */
export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomReturn {
    const { url, token, onConnected, onReconnecting, onDisconnected, onError } = options;

    // Callbacks Ref (to remove from dependency array)
    const onConnectedRef = useRef(onConnected);
    const onReconnectingRef = useRef(onReconnecting);
    const onDisconnectedRef = useRef(onDisconnected);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onConnectedRef.current = onConnected;
        onReconnectingRef.current = onReconnecting;
        onDisconnectedRef.current = onDisconnected;
        onErrorRef.current = onError;
    }, [onConnected, onReconnecting, onDisconnected, onError]);

    // State
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const [localTrack, setLocalTrack] = useState<LocalVideoTrack | undefined>();
    const [remoteTrack, setRemoteTrack] = useState<RemoteVideoTrack | undefined>();
    const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | undefined>();

    // Refs for Stability
    const roomRef = useRef<Room | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    // Connect Effect
    useEffect(() => {
        if (!token || !url) return;

        // 1. Session & Cancel Flag
        const sessionId = Math.random().toString(36).substring(7);
        sessionIdRef.current = sessionId;
        let cancelled = false;

        console.log(`🔒 [LiveKit] Starting Session ${sessionId}`);

        // 2. Create Local Room Instance
        const room = new Room({
            videoCaptureDefaults: {
                resolution: VideoPresets.h720.resolution,
            },
            adaptiveStream: true,
            dynacast: true,
        });

        // Update ref for external access (disconnect button)
        roomRef.current = room;
        setRoom(room);

        // 3. Enhanced Logging & Event Handlers
        const handleConnected = () => {
            if (cancelled) return;
            console.log(`✅ [LiveKit] Connected (Session ${sessionId})`);
            onConnectedRef.current?.();
            setIsConnecting(false);
            
            // Safe Publish
            room.localParticipant.enableCameraAndMicrophone()
                .catch(e => {
                    if (!cancelled) console.error("Failed to publish tracks:", e);
                });

            // Initial Sync
            if (room.remoteParticipants.size > 0) {
                const p = Array.from(room.remoteParticipants.values())[0];
                setRemoteParticipant(p);
                p.trackPublications.forEach((pub) => {
                    if (pub.kind === Track.Kind.Video && pub.track) {
                        setRemoteTrack(pub.track as RemoteVideoTrack);
                    }
                });
            }
        };

        const handleDisconnected = (reason?: any) => {
            if (cancelled) {
                console.log(`🔇 [LiveKit] Disconnected ignored (Stale Session ${sessionId})`);
                return;
            }
            console.log(`🚫 [LiveKit] Disconnected (Session ${sessionId}) reason =`, reason);
            console.log(`🚫 [LiveKit] State: ${room.state}`);
            
            onDisconnectedRef.current?.();
            setIsConnecting(false);
            setLocalTrack(undefined);
            setRemoteTrack(undefined);
            setRemoteParticipant(undefined);
        };

        const handleReconnecting = () => {
             if (cancelled) return;
             console.log(`⚠️ [LiveKit] Reconnecting (Session ${sessionId})...`);
             onReconnectingRef.current?.();
        };

        const handleReconnected = () => {
             if (cancelled) return;
             console.log(`✅ [LiveKit] Reconnected (Session ${sessionId})`);
        };

        const handleConnectionStateChanged = (state: any) => {
             if (cancelled) return;
             console.log(`📡 [LiveKit] ConnectionStateChanged: ${state}`);
        };

        const handleMediaDevicesError = (e: any) => {
             if (cancelled) return;
             console.error(`🎤📷 [LiveKit] MediaDevicesError:`, e);
        };

        const handleParticipantConnected = (participant: RemoteParticipant) => {
            if (cancelled) return;
            console.log('👤 [LiveKit] Participant Connected:', participant.identity);
            setRemoteParticipant(participant);
        };

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
             if (cancelled) return;
             console.log('👋 [LiveKit] Participant Left:', participant.identity);
             if (remoteParticipant?.identity === participant.identity) {
                 setRemoteParticipant(undefined);
                 setRemoteTrack(undefined);
             }
        };

        const handleTrackSubscribed = (track: Track, _pub: any, participant: RemoteParticipant) => {
             if (cancelled) return;
             console.log('🎥 [LiveKit] Track Subscribed:', track.kind, participant.identity);
             if (track.kind === Track.Kind.Video) {
                 setRemoteTrack(track as RemoteVideoTrack);
                 setRemoteParticipant(participant);
             }
             if (track.kind === Track.Kind.Audio) {
                 track.attach();
             }
        };

        const handleTrackUnsubscribed = (track: Track) => {
            if (cancelled) return;
            console.log('❌ [LiveKit] Track Unsubscribed:', track.kind);
            if (track.kind === Track.Kind.Video) {
                setRemoteTrack(undefined);
            }
            if (track.kind === Track.Kind.Audio) {
                track.detach();
            }
        };

        const handleLocalTrackPublished = (pub: any) => {
             if (cancelled) return;
             console.log('📤 [LiveKit] Local Track Published:', pub.kind);
             if (pub.kind === Track.Kind.Video && pub.track) {
                 setLocalTrack(pub.track as LocalVideoTrack);
             }
        };

        // Attach Listeners
        room
            .on(RoomEvent.Connected, handleConnected)
            .on(RoomEvent.Disconnected, handleDisconnected)
            .on(RoomEvent.Reconnecting, handleReconnecting)
            .on(RoomEvent.Reconnected, handleReconnected)
            .on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
            .on(RoomEvent.MediaDevicesError, handleMediaDevicesError)
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

        // 4. Connect with Cancellation Check
        setIsConnecting(true);
        setError(null);
            
        (async () => {
            try {
                console.log(`🚀 [LiveKit] Connecting inside Effect (Session ${sessionId})...`);
                await room.connect(url, token);
                
                if (cancelled) {
                    console.log(`🛑 [LiveKit] Connected after cleanup. Disconnecting immediately (Session ${sessionId})`);
                    room.disconnect(); 
                    return;
                }
            } catch (e) {
                if (cancelled) return;
                console.error("❌ [LiveKit] connect failed:", e);
                setError(e instanceof Error ? e : new Error(String(e)));
                setIsConnecting(false);
                onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
            }
        })();

        // 5. Cleanup Function
        return () => {
            console.log(`🔓 [LiveKit] Cleaning up Session ${sessionId}`);
            cancelled = true;
            
            if (sessionIdRef.current === sessionId) {
                sessionIdRef.current = null;
            }

            // Clean up this specific room instance
            room.removeAllListeners();
            room.disconnect();
        };
    }, [url, token]);

    // Explicit Disconnect Function for UI "End Call"
    const disconnect = useCallback(async () => {
        if (roomRef.current) {
            console.log("🛑 [LiveKit] User initiated User Disconnect");
            // Invalidate current session to prevent any further updates from this session
            sessionIdRef.current = null; 
            await roomRef.current.disconnect();
        }
    }, []);

    return {
        room,
        localTrack,
        remoteTrack,
        remoteParticipant,
        isConnecting,
        error,
        disconnect,
    };
}
