
// =========================
// 1) users
// =========================
export type UserRole = 'ADMIN' | 'WORKER';

export interface DB_User {
    user_id: number;
    role: UserRole;
    password_hash: string;
    name: string;
    phone_number: string;
    email?: string | null;
    birth_date?: string | null; // DATE -> string (YYYY-MM-DD)
    is_active: boolean;
    created_at: string;
    updated_at: string;
    assigned_zone_id?: number | null; // 관리자에 의해 배정된 담당 구역
}

// =========================
// 2) batches
// =========================
export type BatchStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface DB_Batch {
    batch_id: number;
    batch_round: number;
    started_at?: string | null;
    completed_at?: string | null;
    deadline_at: string;
    status: BatchStatus;
    created_at: string;
}

// =========================
// 3) batch_tasks & 6) batch_task_items
// =========================
export type BatchTaskStatus = 'UNASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskActionStatus = 'SCAN_TOTE' | 'SCAN_LOCATION' | 'SCAN_ITEM' | 'ADJUST_QUANTITY' | 'COMPLETE_TASK';

export interface DB_BatchTask {
    batch_task_id: number;
    batch_id: number;
    worker_id?: number | null;
    status: BatchTaskStatus;
    started_at?: string | null;
    completed_at?: string | null;
    tote_id?: number | null;
    tote_scanned_at?: string | null;
    tote_released_at?: string | null;

    // Added Columns
    zone_id: number;
    created_at: string;
    updated_at: string;
    action_status: TaskActionStatus;
    location_scanned_at?: string | null;
    current_location_id?: number | null;
}

export type BatchTaskItemStatus = 'PENDING' | 'DONE' | 'ISSUE';

export interface DB_BatchTaskItem {
    batch_task_item_id: number;
    batch_task_id: number;
    product_id: number;
    location_id: number;
    required_qty: number;
    picked_qty: number;
    status: BatchTaskItemStatus;
    completed_at?: string | null;
    last_scanned_at?: string | null;
}

// =========================
// 4) totes
// =========================
export interface DB_Tote {
    tote_id: number;
    current_batch_task_id?: number | null;
    is_active: boolean;
    barcode: string;
}

// =========================
// 5) products
// =========================
export interface DB_Product {
    product_id: number;
    barcode: string;
    product_name: string;
    product_image?: string | null;
    location_id?: number | null;
    zone_id?: number | null;
}

// =========================
// 7) work_logs & 8) work_log_events
// =========================
export type WorkLogEventType = 'START' | 'PAUSE' | 'RESUME' | 'END';

export interface DB_WorkLog {
    work_log_id: number;
    worker_id: number;
    started_at: string;
    planned_end_at: string;
    ended_at?: string | null;
}

export interface DB_WorkLogEvent {
    event_id: number;
    work_log_id: number;
    event_type: WorkLogEventType;
    reason?: string | null;
    occurred_at: string; // DATETIME
}

// =========================
// 9) zones
// =========================
export interface DB_Zone {
    zone_id: number;
    map_id?: number | null;
}

// =========================
// 10) zone_assignments
// =========================
export type AssignmentType = 'BASE' | 'TEMP';
export type AssignmentSource = 'ADMIN' | 'AI';

export interface DB_ZoneAssignment {
    assignment_id: number;
    worker_id: number;
    zone_id: number;
    assignment_type: AssignmentType;
    source: AssignmentSource;
    assigned_by_admin_id?: number | null;
    started_at: string;
    ended_at?: string | null;
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
    issue_id: number;
    issue_type: IssueType;
    status: IssueStatus;
    priority: IssuePriority;
    reason_code: IssueReasonCode;
    // required_action removed in schema, replaced/augmented by issue_handling & admin_required
    issue_handling: IssueHandling;
    admin_required: boolean;

    worker_id: number;
    admin_id?: number | null;
    batch_task_id: number;
    batch_task_item_id?: number | null;
    zone_location_id?: number | null;

    created_at: string;
    resolved_at?: string | null;
    note?: string | null;
}

// =========================
// 12) issue_images
// =========================
export interface DB_IssueImage {
    issue_image_id: number;
    issue_id: number;
    image_url: string;
    created_at: string;
}

// =========================
// 13) ai_judgments
// =========================
export type AiDecision = 'PASS' | 'FAIL' | 'NEED_CHECK' | 'UNKNOWN';

export interface DB_AiJudgment {
    judgment_id: number;
    issue_id: number;
    image_url?: string | null;
    ai_result?: any | null; // JSON
    confidence?: number | null; // DECIMAL
    ai_decision: AiDecision;
    summary?: string | null;
    created_at: string;
}

// =========================
// 14) webrtc_calls
// =========================
export type CallStatus = 'REQUESTED' | 'CONNECTED' | 'MISSED' | 'ENDED';

export interface DB_WebRTCCall {
    call_id: number;
    issue_id: number;
    worker_id: number;
    admin_id?: number | null;
    session_key: string;
    status: CallStatus;
    started_at: string;
    ended_at?: string | null;
}

// =========================
// 15) control_maps
// =========================
export interface DB_ControlMap {
    map_id: number;
    map_name: string;
    image_url: string;
    created_at: string;
}

// =========================
// 16) map_zone_polygons
// =========================
export interface DB_MapZonePolygon {
    polygon_id: number;
    map_id: number;
    zone_id: number;
    points_json: any; // JSON
    created_at: string;
}

// =========================
// 17) zone_lines
// =========================
export interface DB_ZoneLine {
    line_id: number;
    zone_id: number;
    line_name: string;
    is_active: boolean;
}

// =========================
// 18) zone_locations
// =========================
export interface DB_ZoneLocation {
    location_id: number;
    map_id: number;
    zone_id: number;
    line_id?: number | null;
    location_code: string;
    x: number;
    y: number;
    is_active: boolean;
    created_at: string;
}

// =========================
// 19) admin_assignments
// =========================
export interface DB_AdminAssignment {
    admin_id: number;
    zone_id: number;
}

// =========================
// 20) call_history
// =========================
export type CallHistoryStatus = 'WAITING' | 'ACTIVE' | 'REJECTED' | 'ENDED' | 'CANCELED' | 'NO_ANSWER';

export interface DB_CallHistory {
    id: number;
    room_name: string;
    caller_id: number;
    callee_id: number;
    issue_id?: number | null;
    status: CallHistoryStatus;
    start_time?: string | null;
    end_time?: string | null;
    created_at: string;
}

// =========================
// UI Types
export type ZoneStatus = 'STABLE' | 'NORMAL' | 'CRITICAL';


export interface IssueResponse extends DB_Issue {
    workerName: string;
    zoneName: string;
    images: DB_IssueImage[];
    judgment?: DB_AiJudgment;
    worker: DB_Worker;
    // Old fields compatibility if needed, else remove
    required_action?: 'WORKER_CONTINUE' | 'ADMIN_REQUIRED' | 'WAIT_ADMIN' | 'AUTO_RESOLVED';
}

// Worker info as used in Dashboard (aggregates + DB_User subset)
export interface DB_Worker extends DB_User {
    // Derived/Runtime status
    status: 'WORKING' | 'PAUSED' | 'OFF_WORK'; // Logic derived from work_logs
    current_zone_id: number | null;
    today_work_count: number;
    work_rate?: number;
    line_number?: number;
    bin_number?: number;
}

// Layout Types for Map
export interface LayoutBin {
    bin_number: number;
    capacity?: number;
}
export interface LayoutLine {
    line_number: number;
    bins: LayoutBin[];
}
export interface ZoneLayout {
    zone_id: number;
    lines: LayoutLine[];
}
