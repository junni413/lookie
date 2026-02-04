// WebRTC 관련 타입 정의

export interface CallRequest {
    callerId: number;
    calleeId: number;
    issueId: number | null;
}

export interface CallResponse {
    callId: number;
    sessionId: string;
    token: string;
}

export interface CancelRequest {
    reason: "TIMEOUT" | "MISTAKE";
}

export type CallStatus = "IDLE" | "WAITING" | "INCOMING" | "ACTIVE" | "ENDED";

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    errorCode: string | null;
    data: T;
}

export interface CallState {
    status: CallStatus;
    callId: number | null;
    sessionId: string | null;
    token: string | null;
    remoteUserId: number | null;
    remoteUserName: string | null;
    issueId: number | null;
}
