import type {
  DB_Issue,
  DB_IssueImage,
  DB_AiJudgment,
  IssueResponse,
  // IssueType,
  // IssuePriority,
  // IssueReasonCode,
  // IssueRequiredAction,
  // IssueStatus,
  DB_WorkLog,
  DB_WorkLogEvent,
  DB_BatchTask,
  DB_Worker,
} from "@/types/db";

// Helper for dates
const now = Date.now();
const m = (min: number) => new Date(now - min * 60000).toISOString();

// Zones (Simple Mock)
export type ZoneStatus = "NORMAL" | "BUSY" | "ISSUE";

export const zonesMock = [
  { id: 1, name: "A 존", status: "NORMAL" },
  { id: 2, name: "B 존", status: "BUSY" },
  { id: 3, name: "C 존", status: "ISSUE" },
  { id: 4, name: "D 존", status: "NORMAL" },
];

// Workers (Simple Mock)
export const workersMock: Record<number, string> = {
  101: "작업자 A",
  102: "작업자 B",
  103: "작업자 C",
  104: "작업자 D",
};

export const adminDashboardMock = {
  summary: {
    working: 12,
    waiting: 5,
    done: 31,
    progress: 72,
  },
  zones: [
    { id: "A", name: "A 존", status: "NORMAL" as ZoneStatus, working: 3, waiting: 1, done: 8 },
    { id: "B", name: "B 존", status: "BUSY" as ZoneStatus, working: 5, waiting: 2, done: 11 },
    { id: "C", name: "C 존", status: "ISSUE" as ZoneStatus, working: 1, waiting: 0, done: 4 },
    { id: "D", name: "D 존", status: "NORMAL" as ZoneStatus, working: 2, waiting: 1, done: 6 },
  ] // Dashboard legacy support
};

// ----------------------------------------------------------------------
// ERD-based Mock Data
// ----------------------------------------------------------------------

export const db_issues: DB_Issue[] = [
  {
    issue_id: 1,
    issue_type: "OUT_OF_STOCK",
    status: "OPEN",
    priority: "HIGH",
    reason_code: "STOCK_EXISTS",
    required_action: "WAIT_ADMIN",
    worker_id: 101, // 작업자 A
    zone_location_id: 2, // B 존
    created_at: m(1),
  },
  {
    issue_id: 2,
    issue_type: "DAMAGED",
    status: "OPEN",
    priority: "MEDIUM",
    reason_code: "DAMAGED",
    required_action: "ADMIN_REQUIRED",
    worker_id: 102, // 작업자 B
    zone_location_id: 3, // C 존
    created_at: m(3),
  },
  {
    issue_id: 3,
    issue_type: "DAMAGED",
    status: "RESOLVED",
    priority: "LOW",
    reason_code: "DAMAGED",
    required_action: "WORKER_CONTINUE",
    worker_id: 103, // 작업자 C
    zone_location_id: 3, // C 존
    created_at: m(12),
    resolved_at: m(1),
  },
  {
    issue_id: 4,
    issue_type: "DAMAGED",
    status: "OPEN",
    priority: "HIGH",
    reason_code: "UNKNOWN",
    required_action: "WAIT_ADMIN",
    worker_id: 101, // 작업자 A
    zone_location_id: 2, // B 존
    created_at: m(15),
  },
  {
    issue_id: 5,
    issue_type: "OUT_OF_STOCK",
    status: "OPEN",
    priority: "LOW",
    reason_code: "UNKNOWN",
    required_action: "WAIT_ADMIN",
    worker_id: 104,
    zone_location_id: 1,
    created_at: m(5),
  }
];

export const db_issue_images: DB_IssueImage[] = [
  {
    issue_image_id: 10,
    issue_id: 2,
    image_url: "https://images.unsplash.com/photo-1610931557994-3f5f8bca1d27?q=80&w=600&auto=format&fit=crop", // Apple with defect
    created_at: m(3),
  },
  {
    issue_image_id: 11,
    issue_id: 3,
    image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop", // Another Apple
    created_at: m(12),
  },
  {
    issue_image_id: 12,
    issue_id: 4,
    image_url: "https://images.unsplash.com/photo-1595475207225-428b62bda831?q=80&w=600&auto=format&fit=crop", // Fruit box
    created_at: m(15),
  },
];

export const db_ai_judgments: DB_AiJudgment[] = [
  {
    judgment_id: 501,
    issue_id: 2,
    ai_decision: "FAIL",
    confidence: 0.85,
    summary: "상품 파손 감지 (찍힘 85%)",
    created_at: m(3),
  },
  {
    judgment_id: 502,
    issue_id: 3,
    ai_decision: "FAIL",
    confidence: 0.92,
    summary: "심각한 파손 감지",
    created_at: m(12),
  },
  {
    judgment_id: 503,
    issue_id: 4, // Unknown
    ai_decision: "UNKNOWN",
    confidence: 0.45,
    summary: "판독 불가",
    created_at: m(15),
  },
];

export const db_work_logs: DB_WorkLog[] = [
  { work_log_id: 1, worker_id: 101, started_at: m(240) }, // Worker A: Working
  { work_log_id: 2, worker_id: 102, started_at: m(230) }, // Worker B: Working
  { work_log_id: 3, worker_id: 103, started_at: m(200), ended_at: m(10) }, // Worker C: Off work
  { work_log_id: 4, worker_id: 104, started_at: m(240) }, // Worker D: Working -> Paused?
];

export const db_work_log_events: DB_WorkLogEvent[] = [
  // Worker A: Working normally
  { event_id: 1, work_log_id: 1, event_type: "START", occurred_at: m(240) },

  // Worker B: Working
  { event_id: 2, work_log_id: 2, event_type: "START", occurred_at: m(230) },

  // Worker C: Ended work
  { event_id: 3, work_log_id: 3, event_type: "START", occurred_at: m(200) },
  { event_id: 4, work_log_id: 3, event_type: "END", occurred_at: m(10) },

  // Worker D: Paused
  { event_id: 5, work_log_id: 4, event_type: "START", occurred_at: m(240) },
  { event_id: 6, work_log_id: 4, event_type: "PAUSE", reason: "Lunch", occurred_at: m(30) },
];

export const db_batch_tasks: DB_BatchTask[] = [
  // Worker A (101): Working in Zone 2 (B Zone), 15 items done today
  { batch_task_id: 1, worker_id: 101, status: "IN_PROGRESS", zone_id: 2, started_at: m(5) },
  ...Array.from({ length: 15 }).map((_, i) => ({
    batch_task_id: 100 + i, worker_id: 101, status: "COMPLETED" as const, zone_id: 2, completed_at: m(60 + i)
  })),

  // Worker B (102): Working in Zone 3 (C Zone), 22 items done
  { batch_task_id: 2, worker_id: 102, status: "IN_PROGRESS", zone_id: 3, started_at: m(10) },
  ...Array.from({ length: 22 }).map((_, i) => ({
    batch_task_id: 200 + i, worker_id: 102, status: "COMPLETED" as const, zone_id: 3, completed_at: m(100 + i)
  })),

  // Worker C (103): Off work, last in Zone 3, 30 items done
  ...Array.from({ length: 30 }).map((_, i) => ({
    batch_task_id: 300 + i, worker_id: 103, status: "COMPLETED" as const, zone_id: 3, completed_at: m(200 + i)
  })),

  // Worker D (104): Paused, last in Zone 1, 10 items done
  { batch_task_id: 3, worker_id: 104, status: "IN_PROGRESS", zone_id: 1, started_at: m(40) }, // Still has active task but paused
  ...Array.from({ length: 10 }).map((_, i) => ({
    batch_task_id: 400 + i, worker_id: 104, status: "COMPLETED" as const, zone_id: 1, completed_at: m(150 + i)
  })),
];

// Helper to derive DB_Worker from ID
export function getDerivedWorker(workerId: number): DB_Worker {
  const name = workersMock[workerId] || "Unknown Worker";

  // 1. Determine Status from WorkLogs/Events
  const log = db_work_logs.find(l => l.worker_id === workerId && !l.ended_at);
  let status: "WORKING" | "PAUSED" | "OFF_WORK" = "OFF_WORK";

  if (log) {
    // Check latest event
    const events = db_work_log_events.filter(e => e.work_log_id === log.work_log_id);
    events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    const lastEvent = events[0];
    if (lastEvent) {
      if (lastEvent.event_type === "PAUSE") status = "PAUSED";
      else if (lastEvent.event_type === "END") status = "OFF_WORK"; // Should be covered by log.ended_at but safe check
      else status = "WORKING";
    } else {
      status = "WORKING"; // Default if log exists but no events (just started)
    }
  }

  // 2. Count Completed Tasks Today
  // Simplified: All mock tasks are "today"
  const doneCount = db_batch_tasks.filter(t => t.worker_id === workerId && t.status === "COMPLETED").length;

  // 3. Current Zone
  // Find IN_PROGRESS task
  const currentTask = db_batch_tasks.find(t => t.worker_id === workerId && t.status === "IN_PROGRESS");
  const currentZoneId = currentTask?.zone_id || null;

  return {
    worker_id: workerId,
    name,
    status,
    today_work_count: doneCount,
    current_zone_id: currentZoneId,
  };
}

// ----------------------------------------------------------------------
// Legacy Support (Typing)
// ----------------------------------------------------------------------
// Dashboard uses these, we will refactor Dashboard to use IssueResponse later
export type AdminIssueItem = IssueResponse; 
