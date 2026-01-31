import type {
  DB_Issue,
  DB_IssueImage,
  DB_AiJudgment,
  IssueResponse,
  DB_WorkLog,
  DB_WorkLogEvent,
  DB_BatchTask,
  DB_Worker,
  ZoneLayout,
} from "@/types/db";

// Helper for dates
const now = Date.now();
const m = (min: number) => new Date(now - min * 60000).toISOString();

// Helper for consistent random (seeded)
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Zones
export type ZoneStatus = "NORMAL" | "BUSY" | "ISSUE";

export const zonesMock: { id: number; name: string; status: ZoneStatus }[] = [
  { id: 1, name: "A 존", status: "NORMAL" },
  { id: 2, name: "B 존", status: "BUSY" },
  { id: 3, name: "C 존", status: "ISSUE" },
  { id: 4, name: "D 존", status: "NORMAL" },
];

/**
 * Generate Mock Layout for a Zone
 */
export const generateZoneLayout = (zoneId: number, numLines: number, binsPerLine: number) => {
  return {
    zone_id: zoneId,
    lines: Array.from({ length: numLines }).map((_, i) => ({
      line_number: i + 1,
      bins: Array.from({ length: binsPerLine }).map((_, j) => ({
        bin_number: j + 1
      }))
    }))
  };
};

export const zonesLayoutMock: Record<number, ZoneLayout> = {
  1: generateZoneLayout(1, 4, 8), // Zone A: 4 lines, 8 bins
  2: generateZoneLayout(2, 5, 10), // Zone B: 5 lines, 10 bins
  3: generateZoneLayout(3, 3, 6),  // Zone C: 3 lines, 6 bins
  4: generateZoneLayout(4, 4, 8),  // Zone D: 4 lines, 8 bins
};

// ----------------------------------------------------------------------
// GENERATE 50 MOCK WORKERS
// ----------------------------------------------------------------------

const NAMES = ["김철수", "이영희", "박지성", "손흥민", "홍길동", "장보고", "이순신", "강감찬", "유관순", "안중근"];
const LAST_NAMES = ["A", "B", "C", "D", "E"];

export const workersMock: Record<number, string> = {};
export const db_work_logs: DB_WorkLog[] = [];
export const db_work_log_events: DB_WorkLogEvent[] = [];
export const db_batch_tasks: DB_BatchTask[] = [];

// Generate 50 workers (ID 101 ~ 150)
for (let i = 0; i < 50; i++) {
  const id = 101 + i;
  const name = `${NAMES[i % NAMES.length]} ${LAST_NAMES[Math.floor(i / 10) % 5]}`;
  workersMock[id] = name;

  // Random Status: 80% Working, 20% Off (Simplified)
  const rand = seededRandom(id * 7); // 0.0 ~ 1.0
  let status: "WORKING" | "PAUSED" | "OFF_WORK" = "OFF_WORK";

  if (rand < 0.8) status = "WORKING";
  // else OFF_WORK

  // Assign Zone if not off work
  // Distribute across Zone 1, 2, 3, 4 based on id
  const zoneId = (i % 4) + 1;

  if (status !== "OFF_WORK") {
    // Create Active Batch Task
    db_batch_tasks.push({
      batch_task_id: id * 100,
      worker_id: id,
      status: "IN_PROGRESS",
      zone_id: zoneId,
      started_at: m(rand * 200)
    });

    // Create Work Log
    db_work_logs.push({ work_log_id: id, worker_id: id, started_at: m(rand * 300) });

    // Create Start Event
    db_work_log_events.push({
      event_id: id * 10,
      work_log_id: id,
      event_type: "START",
      occurred_at: m(rand * 300)
    });
  }

  // Add some completed tasks for everyone
  const doneCount = Math.floor(seededRandom(id * 3) * 30);
  for (let k = 0; k < doneCount; k++) {
    db_batch_tasks.push({
      batch_task_id: id * 1000 + k,
      worker_id: id,
      status: "COMPLETED",
      zone_id: zoneId,
      completed_at: m(240 - k * 5)
    });
  }
}


// Issues (Keep static for now, linked to specific workers if needed)
export const db_issues: DB_Issue[] = [
  // ... can keep minimal or generate if needed. keeping minimal to avoid clutter
  {
    issue_id: 1, issue_type: "OUT_OF_STOCK", status: "OPEN", priority: "HIGH", reason_code: "STOCK_EXISTS", required_action: "WAIT_ADMIN",
    worker_id: 101, zone_location_id: 2, created_at: m(1),
  },
  {
    issue_id: 2, issue_type: "DAMAGED", status: "OPEN", priority: "MEDIUM", reason_code: "DAMAGED", required_action: "ADMIN_REQUIRED",
    worker_id: 102, zone_location_id: 3, created_at: m(3),
  },
];

export const db_issue_images: DB_IssueImage[] = [
  { issue_image_id: 10, issue_id: 2, image_url: "https://images.unsplash.com/photo-1610931557994-3f5f8bca1d27?q=80&w=600&auto=format&fit=crop", created_at: m(3) }
];

export const db_ai_judgments: DB_AiJudgment[] = [
  { judgment_id: 501, issue_id: 2, ai_decision: "FAIL", confidence: 0.85, summary: "파손", created_at: m(3) }
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
      else if (lastEvent.event_type === "END") status = "OFF_WORK";
      else status = "WORKING";
    } else {
      status = "WORKING";
    }
  }

  // 2. Count Completed Tasks Today
  const doneCount = db_batch_tasks.filter(t => t.worker_id === workerId && t.status === "COMPLETED").length;

  // 3. Current Zone
  const currentTask = db_batch_tasks.find(t => t.worker_id === workerId && t.status === "IN_PROGRESS");
  const currentZoneId = currentTask?.zone_id || null;

  // 4. Determine Location (Line/Bin) safely
  let line_number, bin_number;

  if (currentZoneId) {
    // Get Layout Constraints
    const layout = zonesLayoutMock[currentZoneId];
    if (layout) {
      const numLines = layout.lines.length;
      // Assume consistent bin count for simplicity or max
      const numBins = layout.lines[0].bins.length;

      // Deterministic Random based on Worker ID
      const r1 = seededRandom(workerId * 10);
      const r2 = seededRandom(workerId * 20);

      line_number = Math.floor(r1 * numLines) + 1;
      bin_number = Math.floor(r2 * numBins) + 1;
    }
  }

  return {
    worker_id: workerId,
    name,
    status,
    today_work_count: doneCount,
    work_rate: Math.floor(seededRandom(workerId * 5) * 100), // Mock 0-100%
    current_zone_id: currentZoneId,
    line_number,
    bin_number,
  };
}

// Legacy Support
export type AdminIssueItem = IssueResponse;
export const adminDashboardMock = {
  summary: { working: 30, waiting: 5, done: 100, progress: 80 },
  zones: zonesMock.map(z => ({ ...z, working: 0, waiting: 0, done: 0 }))
};
