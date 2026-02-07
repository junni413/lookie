import { Client, type StompSubscription } from '@stomp/stompjs';

export interface CallStatusEvent {
    type: 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'ENDED' | 'REQUESTED';
    callId: number;
    roomId?: string;
    reason?: string;
    timestamp: number;
    messageId?: string; // [New] UUID for deduplication
}

export type CallStatusListener = (event: CallStatusEvent) => void;

let client: Client | null = null;
let subscription: StompSubscription | null = null;

// WebSocket Endpoint URL Setting
// Detects environment automatically:
// - Localhost: Direct connection to 8080 (Bypasses proxy for stability)
// - Production: Uses window.location (Standard generic path)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const brokerURL = isLocal
    ? `ws://localhost:8080/api/realtime/connect/websocket`
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/realtime/connect/websocket`;

/**
 * WebSocket(STOMP) 연결 및 통화 상태 구독
 */
export function subscribeCallStatus(
    callId: number,
    token: string,
    onStatusChange: CallStatusListener,
    onError?: (error: any) => void
): () => void {

    const onConnectHandler = () => {
        console.log('✅ [STOMP] Connected (Call Status)');

        const topic = `/topic/video-calls/${callId}`;
        console.log(`📡 [STOMP] Subscribing to ${topic}`);

        if (subscription) {
            subscription.unsubscribe();
        }

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
                    messageId: backendMessage.messageId, // Map messageId
                };

                onStatusChange(frontendEvent);
            } catch (e) {
                console.error('❌ [STOMP] Parse error:', e);
            }
        });
    };

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

    // [Fix] Handle "Already Connected" State
    // If connected, run handler immediately. Otherwise, set callback.
    if (client.connected) {
        onConnectHandler();
    } else {
        client.onConnect = onConnectHandler;
        if (!client.active) {
            client.activate();
        }
    }

    // Cleanup function
    return () => {
        console.log('🔌 [STOMP] Cleanup (Unsubscribing only)');
        if (subscription) {
            subscription.unsubscribe();
            subscription = null;
        }
        // [Fix] Do NOT deactivate client here. Keep connection alive.
        // if (client) {
        //     client.deactivate();
        //     client = null;
        // }
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

        // Deduplication Cache (UUID based)
        const processedMessageIds = new Set<string>();

        const handler = (message: any, topicName: string) => {
            try {
                const body = JSON.parse(message.body);
                const messageId = body.messageId; // Backend now provides UUID

                // Fallback for legacy messages without UUID (though backend enforces it now)
                const dedupKey = messageId || `${body.type}-${body.callId}`;

                if (processedMessageIds.has(dedupKey)) {
                    console.log(`🧹 [STOMP] Ignoring duplicate event (ID: ${dedupKey})`);
                    return;
                }

                processedMessageIds.add(dedupKey);
                // Keep ID in cache for 10 seconds to handle network jitter
                setTimeout(() => processedMessageIds.delete(dedupKey), 10000);

                console.log(`📨 [STOMP] Incoming Call via [${topicName}]:`, body);

                const frontendEvent: CallStatusEvent = {
                    type: body.type,
                    callId: body.callId,
                    roomId: body.roomId,
                    timestamp: body.timestamp || Date.now(),
                    reason: body.callerName,
                    messageId: messageId
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

/**
 * AI 판정 결과 구독 (Issue Result)
 * /topic/issues/{issueId}
 */
export function subscribeIssueResult(
    issueId: number,
    token: string,
    onResult: (event: any) => void
): () => void {
    if (!client) {
        client = new Client({
            brokerURL,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });
    }

    client.connectHeaders = {
        Authorization: `Bearer ${token}`,
    };

    const topic = `/topic/issues/${issueId}`;
    let issueSubscription: StompSubscription | null = null;

    const subscribeAction = () => {
        console.log(`📡 [STOMP] Subscribing to ${topic}`);
        issueSubscription = client!.subscribe(topic, (message) => {
            try {
                const body = JSON.parse(message.body);
                console.log(`📨 [STOMP] Issue Result Received:`, body);
                onResult(body);
            } catch (e) {
                console.error('❌ [STOMP] Issue Result Parse error:', e);
            }
        });
    };

    if (client.connected) {
        subscribeAction();
    } else {
        client.onConnect = () => {
            console.log('✅ [STOMP] Connected (Issue Result)');
            subscribeAction();
        };
        if (!client.active) {
            client.activate();
        }
    }

    return () => {
        console.log(`🔌 [STOMP] Unsubscribing from ${topic}`);
        if (issueSubscription) {
            issueSubscription.unsubscribe();
        }
    };
}

/**
 * 클라이언트 연결 해제 (로그아웃 시 호출)
 */
export async function disconnectClient() {
    if (client) {
        console.log("🔌 [STOMP] Force disconnecting client...");
        if (client.active) {
            await client.deactivate();
        }
        client = null;
        subscription = null;
    }
}
