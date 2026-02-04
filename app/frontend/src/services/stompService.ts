import { Client, type StompSubscription } from '@stomp/stompjs';

export interface CallStatusEvent {
    type: 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'ENDED';
    callId: number;
    roomId?: string;
    reason?: string;
    timestamp: number;
}

export type CallStatusListener = (event: CallStatusEvent) => void;

let client: Client | null = null;
let subscription: StompSubscription | null = null;

const brokerURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/realtime/connect/websocket`;

/**
 * WebSocket(STOMP) 연결 및 통화 상태 구독
 */
export function subscribeCallStatus(
    callId: number,
    token: string,
    onStatusChange: CallStatusListener,
    onError?: (error: any) => void
): () => void {

    if (!client) {
        client = new Client({
            brokerURL,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            debug: (str) => console.log(`🔍 [STOMP] ${str}`),

            onWebSocketClose: (event) => {
                console.error("❌ [STOMP] WebSocket Closed:", event.code, event.reason);
            },
        });

        client.onStompError = (frame) => {
            console.error('❌ [STOMP] Error:', frame.headers['message']);
            onError?.(new Error(frame.headers['message']));
        };
    }

    console.log(`🔑 [STOMP] Auth: Bearer ${token.substring(0, 10)}...`);
    client.connectHeaders = {
        Authorization: `Bearer ${token}`,
    };

    client.onConnect = () => {
        console.log('✅ [STOMP] Connected');

        const topic = `/topic/video-calls/${callId}`;
        console.log(`📡 [STOMP] Subscribing to ${topic}`);

        subscription = client!.subscribe(topic, (message) => {
            try {
                const backendMessage = JSON.parse(message.body);
                console.log(`📨 [STOMP] Message:`, backendMessage);

                // Transform backend DTO to frontend event
                const frontendEvent: CallStatusEvent = {
                    type: backendMessage.type,
                    callId: backendMessage.callId,
                    roomId: backendMessage.roomId || undefined,
                    timestamp: backendMessage.timestamp,
                };

                onStatusChange(frontendEvent);
            } catch (e) {
                console.error('❌ [STOMP] Parse error:', e);
            }
        });
    };

    if (!client.active) {
        client.activate();
    }

    // Cleanup function
    return () => {
        console.log('🔌 [STOMP] Cleanup');
        if (subscription) {
            subscription.unsubscribe();
            subscription = null;
        }
        if (client) {
            client.deactivate();
            client = null;
        }
    };
}
