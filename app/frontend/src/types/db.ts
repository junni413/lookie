
// =========================
// 1) users
// =========================
export type UserRole = 'ADMIN' | 'WORKER';

export interface DB_User {
    userId: number;
    role: UserRole;
    passwordHash: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
    birthDate?: string | null; // DATE -> string (YYYY-MM-DD)
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    assignedZoneId?: number | null; // 관리자에 의해 배정된 담당 구역
}

// =========================
// 2) batches
// =========================
export type BatchStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface DB_Batch {
    batchId: number;
    batchRound: number;
    startedAt?: string | null;
    completedAt?: string | null;
    deadlineAt: string;
    status: BatchStatus;
    createdAt: string;
}

// =========================
// 3) batch_tasks & 6) batch_task_items
// =========================
export type BatchTaskStatus = 'UNASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskActionStatus = 'SCAN_TOTE' | 'SCAN_LOCATION' | 'SCAN_ITEM' | 'ADJUST_QUANTITY' | 'COMPLETE_TASK';

export interface DB_BatchTask {
    batchTaskId: number;
    batchId: number;
    workerId?: number | null;
    status: BatchTaskStatus;
    startedAt?: string | null;
    completedAt?: string | null;
    toteId?: number | null;
    toteScannedAt?: string | null;
    toteReleasedAt?: string | null;

    // Added Columns
    zoneId: number;
    createdAt: string;
    updatedAt: string;
    actionStatus: TaskActionStatus;
    locationScannedAt?: string | null;
    currentLocationId?: number | null;
}

export type BatchTaskItemStatus = 'PENDING' | 'DONE' | 'ISSUE';

export interface DB_BatchTaskItem {
    batchTaskItemId: number;
    batchTaskId: number;
    productId: number;
    locationId: number;
    requiredQty: number;
    pickedQty: number;
    status: BatchTaskItemStatus;
    completedAt?: string | null;
    lastScannedAt?: string | null;
}

// =========================
// 4) totes
// =========================
export interface DB_Tote {
    toteId: number;
    currentBatchTaskId?: number | null;
    isActive: boolean;
    barcode: string;
}

// =========================
// 5) products
// =========================
export interface DB_Product {
    productId: number;
    barcode: string;
    productName: string;
    productImage?: string | null;
    locationId?: number | null;
    zoneId?: number | null;
}

// =========================
// 7) work_logs & 8) work_log_events
// =========================
export type WorkLogEventType = 'START' | 'PAUSE' | 'RESUME' | 'END';

export interface DB_WorkLog {
    workLogId: number;
    workerId: number;
    startedAt: string;
    plannedEndAt: string;
    endedAt?: string | null;
}

export interface DB_WorkLogEvent {
    eventId: number;
    workLogId: number;
    eventType: WorkLogEventType;
    reason?: string | null;
    occurredAt: string; // DATETIME
}

// =========================
// 9) zones
// =========================
export interface DB_Zone {
    zoneId: number;
    mapId?: number | null;
}

// =========================
// 10) zone_assignments
// =========================
export type AssignmentType = 'BASE' | 'TEMP';
export type AssignmentSource = 'ADMIN' | 'AI';

export interface DB_ZoneAssignment {
    assignmentId: number;
    workerId: number;
    zoneId: number;
    assignmentType: AssignmentType;
    source: AssignmentSource;
    assignedByAdminId?: number | null;
    startedAt: string;
    endedAt?: string | null;
    reason?: string | null;
}

// =========================
// 11) issues
// =========================
export type IssueType = 'DAMAGED' | 'OUT_OF_STOCK';
export type IssueStatus = 'OPEN' | 'RESOLVED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type IssueReasonCode = 'DAMAGED' | 'MOVE_LOCATION' | 'WAITING_RETURN' | 'STOCK_EXISTS' | 'UNKNOWN' | 'AUTO_RESOLVED';
export type IssueHandling = 'BLOCKING' | 'NON_BLOCKING';

export interface DB_Issue {
    issueId: number;
    issueType: IssueType;
    status: IssueStatus;
    priority: IssuePriority;
    reasonCode: IssueReasonCode;
    // required_action removed in schema, replaced/augmented by issue_handling & admin_required
    issueHandling: IssueHandling;
    adminRequired: boolean;

    workerId: number;
    adminId?: number | null;
    batchTaskId: number;
    batchTaskItemId?: number | null;
    zoneLocationId?: number | null;

    createdAt: string;
    resolvedAt?: string | null;
    note?: string | null;
}

// =========================
// 12) issue_images
// =========================
export interface DB_IssueImage {
    issueImageId: number;
    issueId: number;
    imageUrl: string;
    createdAt: string;
}

// =========================
// 13) ai_judgments
// =========================
export type AiDecision = 'PASS' | 'FAIL' | 'NEED_CHECK' | 'UNKNOWN';

export interface DB_AiJudgment {
    judgmentId: number;
    issueId: number;
    imageUrl?: string | null;
    aiResult?: any | null; // JSON
    confidence?: number | null; // DECIMAL
    aiDecision: AiDecision;
    summary?: string | null;
    createdAt: string;
}

// =========================
// 14) webrtc_calls
// =========================
export type CallStatus = 'REQUESTED' | 'CONNECTED' | 'MISSED' | 'ENDED';

export interface DB_WebRTCCall {
    callId: number;
    issueId: number;
    workerId: number;
    adminId?: number | null;
    sessionKey: string;
    status: CallStatus;
    startedAt: string;
    endedAt?: string | null;
}

// =========================
// 15) control_maps
// =========================
export interface DB_ControlMap {
    mapId: number;
    mapName: string;
    imageUrl: string;
    createdAt: string;
}

// =========================
// 16) map_zone_polygons
// =========================
export interface DB_MapZonePolygon {
    polygonId: number;
    mapId: number;
    zoneId: number;
    pointsJson: any; // JSON
    createdAt: string;
}

// =========================
// 17) zone_lines
// =========================
export interface DB_ZoneLine {
    lineId: number;
    zoneId: number;
    lineName: string;
    isActive: boolean;
}

// =========================
// 18) zone_locations
// =========================
export interface DB_ZoneLocation {
    locationId: number;
    mapId: number;
    zoneId: number;
    lineId?: number | null;
    locationCode: string;
    x: number;
    y: number;
    isActive: boolean;
    createdAt: string;
}

// =========================
// 19) admin_assignments
// =========================
export interface DB_AdminAssignment {
    adminId: number;
    zoneId: number;
}

// =========================
// 20) call_history
// =========================
export type CallHistoryStatus = 'WAITING' | 'ACTIVE' | 'REJECTED' | 'ENDED' | 'CANCELED' | 'NO_ANSWER';

export interface DB_CallHistory {
    id: number;
    roomName: string;
    callerId: number;
    calleeId: number;
    issueId?: number | null;
    status: CallHistoryStatus;
    startTime?: string | null;
    endTime?: string | null;
    createdAt: string;
}

// =========================
// UI Types

export interface ZoneStat {
    zoneId: number;
    name: string;
    status: ZoneStatus;
    workerCount: number;
    workRate: number; // percentage (0-100)
    openIssueCount?: number;
    remainingDeadlineMinutes?: number;
    estimatedCompletionMinutes?: number;
}

export type ZoneStatus = 'STABLE' | 'NORMAL' | 'CRITICAL';


export interface IssueResponse extends DB_Issue {
    workerName: string;
    zoneName: string;
    images: DB_IssueImage[];
    judgment?: DB_AiJudgment;
    worker: DB_Worker;
    // Old fields compatibility if needed, else remove
    requiredAction?: 'WORKER_CONTINUE' | 'ADMIN_REQUIRED' | 'WAIT_ADMIN' | 'AUTO_RESOLVED';
}

// Worker info as used in Dashboard (aggregates + DB_User subset)
export interface DB_Worker extends DB_User {
    // Derived/Runtime status
    status: 'WORKING' | 'PAUSED' | 'OFF_WORK'; // Logic derived from work_logs
    currentZoneId: number | null;
    todayWorkCount: number;
    workRate?: number;
    lineNumber?: number;
    binNumber?: number;
    // Enhanced fields for Manage Page
    processingSpeed?: number;
    currentTaskProgress?: number;
    webrtcStatus?: string;
    isBottleneck?: boolean;
    hasOpenIssue?: boolean;
    openIssueType?: string;
}

// Layout Types for Map
export interface LayoutBin {
    binNumber: number;
    capacity?: number;
}
export interface LayoutLine {
    lineNumber: number;
    bins: LayoutBin[];
}
export interface ZoneLayout {
    zoneId: number;
    lines: LayoutLine[];
}
