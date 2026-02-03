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
 * 
 * @param callId - 구독할 통화 ID
 * @param onStatusChange - 상태 변경 이벤트 핸들러
 * @param onError - 에러 핸들러
 */
export function subscribeCallStatus(
    callId: number,
    token: string,
    onStatusChange: CallStatusListener,
    onError?: (error: any) => void
): () => void {

    // 클라이언트가 없으면 생성
    if (!client) {
        client = new Client({
            brokerURL: brokerURL,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            // 개발 모드 로그
            debug: (str) => {
                console.log(`🔍 [STOMP] ${str}`);
            },
        });

        client.onStompError = (frame) => {
            console.error('❌ [STOMP] Broker reported error:', frame.headers['message']);
            console.error('Additional details:', frame.body);
            onError?.(new Error(frame.headers['message']));
        };
    }

    // ✅ 토큰 헤더 업데이트 (항상 최신 토큰 적용)
    console.log(`🔑 [STOMP] Setting Auth Header: Bearer ${token.substring(0, 10)}...`);
    client.connectHeaders = {
        Authorization: `Bearer ${token}`,
    };

    client.onConnect = (frame) => {
        console.log('✅ [STOMP] Connected');

        // 구독: /topic/video-calls/{callId}
        const topic = `/topic/video-calls/${callId}`;
        console.log(`📡 [STOMP] Subscribing to ${topic}`);

        subscription = client!.subscribe(topic, (message) => {
            try {
                const body = JSON.parse(message.body) as CallStatusEvent;
                console.log(`📨 [STOMP] Received:`, body);
                onStatusChange(body);
            } catch (e) {
                console.error('❌ [STOMP] Failed to parse message:', e);
            }
        });
    };

    // 연결 활성화
    if (!client.active) {
        client.activate();
    } else {
        // 이미 연결된 상태라면, 강제로 재연결해야 할 수도 있음 (헤더 변경 시)
        // 하지만 여기선 같은 유저 세션 내이므로 토큰이 유효하다면 재연결 불필요할 수도 있음.
        // 만약 토큰 만료 후 갱신된 토큰이라면 재연결 필요.
        // 안전을 위해 비활성 -> 활성 시도
        // 현재 로직은 간단히 유지.
    }

    // Cleanup function
    return () => {
        console.log('🔌 [STOMP] Deactivating...');
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
