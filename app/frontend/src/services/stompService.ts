import { Client, type StompSubscription } from '@stomp/stompjs';

export interface CallStatusEvent {
    type: 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'ENDED' | 'REQUESTED';
    callId: number;
    roomId?: string;
    reason?: string;
    timestamp: number;
}

export type CallStatusListener = (event: CallStatusEvent) => void;

let client: Client | null = null;
let subscription: StompSubscription | null = null;

// 잠시 프록시 우회하여 8080 포트로 직접 연결 시도
const brokerURL = `ws://localhost:8080/api/realtime/connect/websocket`;
// const brokerURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/realtime/connect/websocket`;

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

/**
 * 수신 전화 구독 (Worker용)
 * /user/queue/calls
 */
export function subscribeIncomingCalls(
    token: string,
    userId: number,
    onIncomingCall: (event: CallStatusEvent) => void
): () => void {
    if (!client) {
        console.log(`🔌 [STOMP] Initializing Client with URL: ${brokerURL}`);
        client = new Client({
            brokerURL,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            onStompError: (frame) => {
                console.error('❌ [STOMP] Error:', frame.headers['message']);
            },
            onWebSocketClose: (event) => {
                console.error("❌ [STOMP] WebSocket Closed:", event.code, event.reason);
            },
            debug: (str) => console.log(`🔍 [STOMP DEBUG] ${str}`),
        });
    }

    if (!client.active) {
        console.log("🔌 [STOMP] Activating client...");
        client.activate();
    } else {
        console.log("🔌 [STOMP] Client already active.");
    }

    // 이미 연결되어 있거나 연결되면 구독 수행
    const subscribeAction = () => {
        console.log(`📡 [STOMP] Subscribing to incoming call topics for User ${userId}`);

        // Deduplication Cache
        const processedEvents = new Set<string>();

        const handler = (message: any, topicName: string) => {
            try {
                const body = JSON.parse(message.body);
                const eventKey = `${body.type}-${body.callId}`;

                if (processedEvents.has(eventKey)) {
                    console.log(`🧹 [STOMP] Ignoring duplicate event: ${eventKey}`);
                    return;
                }

                processedEvents.add(eventKey);
                setTimeout(() => processedEvents.delete(eventKey), 500); // 0.5초 후 만료

                console.log(`📨 [STOMP] Incoming Call via [${topicName}]:`, body);

                const frontendEvent: CallStatusEvent = {
                    type: body.type,
                    callId: body.callId,
                    roomId: body.roomId,
                    timestamp: body.timestamp || Date.now(),
                    reason: body.callerName
                };
                onIncomingCall(frontendEvent);

            } catch (e) {
                console.error('❌ [STOMP] Parse error:', e);
            }
        };

        // Store subscriptions to clean up later
        const subscriptions: any[] = [];

        // 1. Standard User Queue
        subscriptions.push(client!.subscribe('/user/queue/calls', (m) => handler(m, '/user/queue/calls')));

        // 2. Manual User ID Queue (Fallback)
        subscriptions.push(client!.subscribe(`/queue/calls/${userId}`, (m) => handler(m, `/queue/calls/${userId}`)));

        // 3. User Topic (Fallback)
        subscriptions.push(client!.subscribe(`/topic/calls/${userId}`, (m) => handler(m, `/topic/calls/${userId}`)));

        return subscriptions;
    };

    let subscriptions: any[] = [];

    if (client.connected) {
        subscriptions = subscribeAction();
    } else {
        client.onConnect = () => {
            console.log('✅ [STOMP] Connected (Incoming)');
            subscriptions = subscribeAction();
        };
    }

    return () => {
        console.log('🔌 [STOMP] Unsubscribing incoming calls...');
        subscriptions.forEach(sub => sub.unsubscribe());
    };
}
