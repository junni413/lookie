
import type {
  DB_User,
  DB_Batch,
  DB_BatchTask,
  DB_BatchTaskItem,
  DB_Issue,
  DB_IssueImage,
  DB_AiJudgment,
  DB_WorkLog,
  DB_WorkLogEvent,
  DB_Zone,
  DB_Tote,
  DB_Product,

  DB_Worker,
  ZoneLayout
} from "@/types/db";

// =============================================================================
// 1. HELPERS
// =============================================================================

const now = Date.now();
const m = (min: number) => new Date(now - min * 60000).toISOString();


function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randInt(seed: number, min: number, max: number) {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function randPick<T>(seed: number, arr: T[]): T {
  return arr[randInt(seed, 0, arr.length - 1)];
}

// =============================================================================
// 2. STATIC MASTER DATA (Zones, Users, Products)
// =============================================================================

// Zones (10 ~ 12 lines each)
export const db_zones: DB_Zone[] = [
  { zone_id: 1, map_id: 1 },
  { zone_id: 2, map_id: 1 },
  { zone_id: 3, map_id: 1 },
  { zone_id: 4, map_id: 1 },
];

export const zoneNames: Record<number, string> = { 1: "Zone A", 2: "Zone B", 3: "Zone C", 4: "Zone D" };

// Users (Workers 101~150, Admins 1~5)
export const db_users: DB_User[] = [];
const NAMES = ["김철수", "이영희", "박지성", "손흥민", "홍길동", "장보고", "이순신", "강감찬", "유관순", "안중근"];

// Create Workers
for (let i = 0; i < 50; i++) {
  const id = 101 + i;
  db_users.push({
    user_id: id,
    role: "WORKER",
    password_hash: "mock_hash",
    name: `${NAMES[i % 10]} ${String.fromCharCode(65 + (i % 5))}`,
    phone_number: `010-0000-${id}`,
    is_active: true,
    created_at: m(10000),
    updated_at: m(0),
    assigned_zone_id: (i % 4) + 1 // 배정된 구역 (1~4)
  });
}

// Create Admins
for (let i = 1; i <= 5; i++) {
  db_users.push({
    user_id: i,
    role: "ADMIN",
    password_hash: "admin_hash",
    name: `관리자${i}`,
    phone_number: `010-9999-000${i}`,
    is_active: true,
    created_at: m(20000),
    updated_at: m(0)
  });
}

// Products
export const db_products: DB_Product[] = Array.from({ length: 50 }).map((_, i) => ({
  product_id: 1000 + i,
  barcode: `880123456${String(i).padStart(4, '0')}`,
  product_name: `상품 ${i + 1}`,
  product_image: `https://via.placeholder.com/150?text=Product+${i + 1}`,
  zone_id: (i % 4) + 1,
  location_id: i * 10
}));

// Totes
export const db_totes: DB_Tote[] = Array.from({ length: 100 }).map((_, i) => ({
  tote_id: 5000 + i,
  barcode: `TOTE-${5000 + i}`,
  is_active: true,
  current_batch_task_id: null
}));

// =============================================================================
// 3. DYNAMIC TRANSACTION DATA (Batches, Tasks, Logs, Issues)
// =============================================================================

export const db_batches: DB_Batch[] = [];
export const db_batch_tasks: DB_BatchTask[] = [];
export const db_batch_task_items: DB_BatchTaskItem[] = [];
export const db_issues: DB_Issue[] = [];
export const db_issue_images: DB_IssueImage[] = [];
export const db_ai_judgments: DB_AiJudgment[] = [];
export const db_work_logs: DB_WorkLog[] = [];
export const db_work_log_events: DB_WorkLogEvent[] = [];

// Create 1 Active Batch
const currentBatchId = 301;
db_batches.push({
  batch_id: currentBatchId,
  batch_round: 1,
  started_at: m(300),
  deadline_at: new Date(now + 120 * 60000).toISOString(), // 2 hours later
  status: "IN_PROGRESS",
  created_at: m(305)
});

// Generate Tasks for Workers
const workers = db_users.filter(u => u.role === "WORKER");

workers.forEach((worker) => {
  const seed = worker.user_id;
  const isWorking = seededRandom(seed) > 0.2; // 80% working

  if (isWorking) {
    // Work Log
    const startOffset = Math.floor(seededRandom(seed + 1) * 240); // 0~4 hours ago
    db_work_logs.push({
      work_log_id: worker.user_id * 10,
      worker_id: worker.user_id,
      started_at: m(startOffset),
      planned_end_at: new Date(now + 480 * 60000).toISOString(),
    });

    db_work_log_events.push({
      event_id: worker.user_id * 100,
      work_log_id: worker.user_id * 10,
      event_type: "START",
      occurred_at: m(startOffset)
    });

    // Assign Tasks
    const taskCount = randInt(seed, 1, 5);
    for (let t = 0; t < taskCount; t++) {
      const taskId = worker.user_id * 1000 + t;
      const zoneId = worker.assigned_zone_id || 1;
      const status = t === taskCount - 1 ? "IN_PROGRESS" : "COMPLETED"; // Last one is active
      const tote = db_totes[(taskId % 100)];

      const task: DB_BatchTask = {
        batch_task_id: taskId,
        batch_id: currentBatchId,
        worker_id: worker.user_id,
        status: status,
        zone_id: zoneId,
        action_status: status === "IN_PROGRESS" ? "SCAN_ITEM" : "COMPLETE_TASK",
        created_at: m(startOffset - t * 20),
        updated_at: m(0),
        tote_id: tote.tote_id,
      };

      db_batch_tasks.push(task);
      if (status === "IN_PROGRESS") tote.current_batch_task_id = taskId;

      // Items
      const itemCount = randInt(seed + t, 2, 5);
      for (let k = 0; k < itemCount; k++) {
        const prod = randPick(seed + k, db_products);
        db_batch_task_items.push({
          batch_task_item_id: taskId * 10 + k,
          batch_task_id: taskId,
          product_id: prod.product_id,
          location_id: prod.location_id || 0,
          required_qty: randInt(seed + k, 1, 5),
          picked_qty: status === "COMPLETED" ? 1 : 0,
          status: status === "COMPLETED" ? "DONE" : "PENDING"
        });
      }

      // Random Issue Generation
      if (seededRandom(taskId) > 0.9) { // 10% chance of issue
        const isResolved = seededRandom(taskId + 1) > 0.5;
        const issue: DB_Issue = {
          issue_id: taskId * 5,
          issue_type: seededRandom(taskId) > 0.5 ? "DAMAGED" : "OUT_OF_STOCK",
          status: isResolved ? "RESOLVED" : "OPEN",
          priority: isResolved ? "LOW" : "HIGH",
          reason_code: "UNKNOWN",
          issue_handling: "BLOCKING",
          admin_required: true,
          worker_id: worker.user_id,
          batch_task_id: taskId,
          zone_location_id: zoneId, // proxy
          created_at: m(randInt(taskId, 5, 60)),
          resolved_at: isResolved ? m(1) : undefined
        };
        db_issues.push(issue);

        // Mock Judgment
        db_ai_judgments.push({
          judgment_id: issue.issue_id * 10,
          issue_id: issue.issue_id,
          ai_result: {},
          confidence: 0.88,
          ai_decision: isResolved ? "PASS" : "NEED_CHECK",
          created_at: issue.created_at
        });

        // Mock Image
        db_issue_images.push({
          issue_image_id: issue.issue_id * 100,
          issue_id: issue.issue_id,
          image_url: "https://via.placeholder.com/300x200?text=Issue+Image",
          created_at: issue.created_at
        });
      }
    }
  }
});

// =============================================================================
// 4. DERIVED DATA HELPERS (For Services)
// =============================================================================

export function getDerivedWorker(workerId: number): DB_Worker | null {
  const user = db_users.find(u => u.user_id === workerId && u.role === "WORKER");
  if (!user) return null;

  const log = db_work_logs.find(l => l.worker_id === workerId && !l.ended_at);
  const status = log ? "WORKING" : "OFF_WORK";

  // Stats
  const completed = db_batch_tasks.filter(t => t.worker_id === workerId && t.status === "COMPLETED").length;

  return {
    ...user,
    status: status as any,
    current_zone_id: user.assigned_zone_id || null,
    today_work_count: completed,
    work_rate: 85 + (workerId % 15) // mock rate
  };
}

// Layout Mock (Visual)
export const zonesLayoutMock: Record<number, ZoneLayout> = {};
[1, 2, 3, 4].forEach(zId => {
  zonesLayoutMock[zId] = {
    zone_id: zId,
    lines: Array.from({ length: 12 }).map((_, i) => ({
      line_number: i + 1,
      bins: Array.from({ length: 6 }).map((_, j) => ({ bin_number: j + 1 }))
    }))
  };
});

// Admin Dashboard Mock Data
export const adminDashboardMock = {
  summary: {
    working: db_work_logs.filter(l => !l.ended_at).length,
    waiting: db_users.filter(u => u.role === "WORKER").length - db_work_logs.filter(l => !l.ended_at).length,
    done: db_batch_tasks.filter(t => t.status === "COMPLETED").length,
    progress: 45 // Dummy
  },
  zones: db_zones.map(z => ({
    id: z.zone_id,
    name: zoneNames[z.zone_id],
    status: (z.zone_id === 3 ? "CRITICAL" : "STABLE") as any
  }))
};
