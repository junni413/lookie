// 1) 이슈 관련 타입
export type IssueType = 'DAMAGED' | 'OUT_OF_STOCK';
export type IssueStatus = 'OPEN' | 'RESOLVED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type IssueReasonCode = 'DAMAGED' | 'MOVE_LOCATION' | 'WAITING_RETURN' | 'STOCK_EXISTS' | 'UNKNOWN';
export type IssueRequiredAction = 'WORKER_CONTINUE' | 'ADMIN_REQUIRED' | 'WAIT_ADMIN' | 'AUTO_RESOLVED';
export type IssueAiDecision = 'PASS' | 'FAIL' | 'RETAKE' | 'UNKNOWN';

// issues (이슈 통합)
export interface DB_Issue {
    issue_id: number;
    issue_type: IssueType;
    status: IssueStatus;
    priority: IssuePriority;
    reason_code: IssueReasonCode;
    required_action: IssueRequiredAction;
    worker_id: number;
    admin_id?: number | null;
    batch_task_id?: number;
    batch_task_item_id?: number | null;
    zone_location_id?: number;
    created_at: string; // ISO String for DATETIME
    resolved_at?: string | null;
    note?: string | null;
}

// issue_images (이슈 이미지 업로드)
export interface DB_IssueImage {
    issue_image_id: number;
    issue_id: number;
    image_url: string;
    created_at: string;
}

// ai_judgments (AI 판정 기록)
export interface DB_AiJudgment {
    judgment_id: number;
    issue_id: number;
    image_url?: string | null;
    ai_result?: any | null; // JSON
    confidence?: number | null; // DECIMAL(5,4) -> number
    ai_decision: IssueAiDecision;
    summary?: string | null;
    created_at: string;
}

export interface IssueResponse extends DB_Issue {
    // Joined fields for UI
    workerName: string; // from worker_id
    zoneName: string;   // from zone_location_id
    images: DB_IssueImage[];
    judgment?: DB_AiJudgment;
    worker: DB_Worker; // Enriched worker info
}


// 2) 관리자 관련 타입
export type WorkLogEventType = 'START' | 'PAUSE' | 'RESUME' | 'END';
export type BatchTaskStatus = 'UNASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type WorkerStatus = 'WORKING' | 'PAUSED' | 'OFF_WORK';

export interface DB_WorkLog {
    work_log_id: number;
    worker_id: number;
    started_at: string;
    planned_end_at?: string;
    ended_at?: string | null;
}

export interface DB_WorkLogEvent {
    event_id: number;
    work_log_id: number;
    event_type: WorkLogEventType;
    reason?: string | null;
    occurred_at: string;
}

export interface DB_BatchTask {
    batch_task_id: number;
    worker_id?: number | null;
    status: BatchTaskStatus;
    started_at?: string | null;
    completed_at?: string | null;
    zone_id?: number;
}

export interface DB_Worker {
    worker_id: number;
    name: string;
    status: WorkerStatus;
    current_zone_id: number | null;
    today_work_count: number;
    work_rate?: number; // 0-100 for visualization
    // Extended for Frontend Visualization
    line_number?: number;
    bin_number?: number;
}

// 3) 관제(Map) 시각화 관련 타입
export interface ZoneLayout {
    zone_id: number;
    lines: LayoutLine[];
}

export interface LayoutLine {
    line_number: number;
    bins: LayoutBin[];
}

export interface LayoutBin {
    bin_number: number;
    capacity?: number;
}

export type ZoneStatus = "STABLE" | "NORMAL" | "CRITICAL";
