
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
  { zoneId: 1, mapId: 1 },
  { zoneId: 2, mapId: 1 },
  { zoneId: 3, mapId: 1 },
  { zoneId: 4, mapId: 1 },
];

export const zoneNames: Record<number, string> = { 1: "Zone A", 2: "Zone B", 3: "Zone C", 4: "Zone D" };

// Users (Workers 101~150, Admins 1~5)
export const db_users: DB_User[] = [];
const NAMES = ["김철수", "이영희", "박지성", "손흥민", "홍길동", "장보고", "이순신", "강감찬", "유관순", "안중근"];

// Create Workers
for (let i = 0; i < 50; i++) {
  const id = 101 + i;
  db_users.push({
    userId: id,
    role: "WORKER",
    passwordHash: "mock_hash",
    name: `${NAMES[i % 10]} ${String.fromCharCode(65 + (i % 5))}`,
    phoneNumber: `010-0000-${id}`,
    isActive: true,
    createdAt: m(10000),
    updatedAt: m(0),
    assignedZoneId: (i % 4) + 1 // 배정된 구역 (1~4)
  });
}

// Create Admins
for (let i = 1; i <= 5; i++) {
  db_users.push({
    userId: i,
    role: "ADMIN",
    passwordHash: "admin_hash",
    name: `관리자${i}`,
    phoneNumber: `010-9999-000${i}`,
    isActive: true,
    createdAt: m(20000),
    updatedAt: m(0)
  });
}

// Products
export const db_products: DB_Product[] = Array.from({ length: 50 }).map((_, i) => ({
  productId: 1000 + i,
  barcode: `880123456${String(i).padStart(4, '0')}`,
  productName: `상품 ${i + 1}`,
  productImage: `https://via.placeholder.com/150?text=Product+${i + 1}`,
  zoneId: (i % 4) + 1,
  locationId: i * 10
}));

// Totes
export const db_totes: DB_Tote[] = Array.from({ length: 100 }).map((_, i) => ({
  toteId: 5000 + i,
  barcode: `TOTE-${5000 + i}`,
  isActive: true,
  currentBatchTaskId: null
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
  batchId: currentBatchId,
  batchRound: 1,
  startedAt: m(300),
  deadlineAt: new Date(now + 120 * 60000).toISOString(), // 2 hours later
  status: "IN_PROGRESS",
  createdAt: m(305)
});

// Generate Tasks for Workers
const workers = db_users.filter(u => u.role === "WORKER");

workers.forEach((worker) => {
  const seed = worker.userId;
  const isWorking = seededRandom(seed) > 0.2; // 80% working

  if (isWorking) {
    // Work Log
    const startOffset = Math.floor(seededRandom(seed + 1) * 240); // 0~4 hours ago
    db_work_logs.push({
      workLogId: worker.userId * 10,
      workerId: worker.userId,
      startedAt: m(startOffset),
      plannedEndAt: new Date(now + 480 * 60000).toISOString(),
    });

    db_work_log_events.push({
      eventId: worker.userId * 100,
      workLogId: worker.userId * 10,
      eventType: "START",
      occurredAt: m(startOffset)
    });

    // Assign Tasks
    const taskCount = randInt(seed, 1, 5);
    for (let t = 0; t < taskCount; t++) {
      const taskId = worker.userId * 1000 + t;
      const zoneId = worker.assignedZoneId || 1;
      const status = t === taskCount - 1 ? "IN_PROGRESS" : "COMPLETED"; // Last one is active
      const tote = db_totes[(taskId % 100)];

      const task: DB_BatchTask = {
        batchTaskId: taskId,
        batchId: currentBatchId,
        workerId: worker.userId,
        status: status,
        zoneId: zoneId,
        actionStatus: status === "IN_PROGRESS" ? "SCAN_ITEM" : "COMPLETE_TASK",
        createdAt: m(startOffset - t * 20),
        updatedAt: m(0),
        toteId: tote.toteId,
      };

      db_batch_tasks.push(task);
      if (status === "IN_PROGRESS") tote.currentBatchTaskId = taskId;

      // Items
      const itemCount = randInt(seed + t, 2, 5);
      for (let k = 0; k < itemCount; k++) {
        const prod = randPick(seed + k, db_products);
        db_batch_task_items.push({
          batchTaskItemId: taskId * 10 + k,
          batchTaskId: taskId,
          productId: prod.productId,
          locationId: prod.locationId || 0,
          requiredQty: randInt(seed + k, 1, 5),
          pickedQty: status === "COMPLETED" ? 1 : 0,
          status: status === "COMPLETED" ? "DONE" : "PENDING"
        });
      }

      // Random Issue Generation
      if (seededRandom(taskId) > 0.9) { // 10% chance of issue
        const isResolved = seededRandom(taskId + 1) > 0.5;
        const issue: DB_Issue = {
          issueId: taskId * 5,
          issueType: seededRandom(taskId) > 0.5 ? "DAMAGED" : "OUT_OF_STOCK",
          status: isResolved ? "RESOLVED" : "OPEN",
          priority: isResolved ? "LOW" : "HIGH",
          reasonCode: "UNKNOWN",
          issueHandling: "BLOCKING",
          adminRequired: true,
          workerId: worker.userId,
          batchTaskId: taskId,
          zoneLocationId: zoneId, // proxy
          createdAt: m(randInt(taskId, 5, 60)),
          resolvedAt: isResolved ? m(1) : undefined
        };
        db_issues.push(issue);

        // Mock Judgment
        db_ai_judgments.push({
          judgmentId: issue.issueId * 10,
          issueId: issue.issueId,
          aiResult: {},
          confidence: 0.88,
          aiDecision: isResolved ? "PASS" : "NEED_CHECK",
          createdAt: issue.createdAt
        });

        // Mock Image
        db_issue_images.push({
          issueImageId: issue.issueId * 100,
          issueId: issue.issueId,
          imageUrl: "https://via.placeholder.com/300x200?text=Issue+Image",
          createdAt: issue.createdAt
        });
      }
    }
  }
});

// =============================================================================
// 4. DERIVED DATA HELPERS (For Services)
// =============================================================================

export function getDerivedWorker(workerId: number): DB_Worker | null {
  const user = db_users.find(u => u.userId === workerId && u.role === "WORKER");
  if (!user) return null;

  const log = db_work_logs.find(l => l.workerId === workerId && !l.endedAt);
  const status = log ? "WORKING" : "OFF_WORK";

  // Stats
  const completed = db_batch_tasks.filter(t => t.workerId === workerId && t.status === "COMPLETED").length;

  return {
    ...user,
    status: status as any,
    currentZoneId: user.assignedZoneId || null,
    todayWorkCount: completed,
    workRate: 85 + (workerId % 15) // mock rate
  };
}

// Zones Layout Mock
export const zonesLayoutMock: Record<number, ZoneLayout> = {};
[1, 2, 3, 4].forEach(zId => {
  zonesLayoutMock[zId] = {
    zoneId: zId,
    lines: Array.from({ length: 12 }).map((_, i) => ({
      lineNumber: i + 1,
      bins: Array.from({ length: 6 }).map((_, j) => ({ binNumber: j + 1 }))
    }))
  };
});

// Admin Dashboard Mock Data
export const adminDashboardMock = {
  summary: {
    working: db_work_logs.filter(l => !l.endedAt).length,
    waiting: db_users.filter(u => u.role === "WORKER").length - db_work_logs.filter(l => !l.endedAt).length,
    done: db_batch_tasks.filter(t => t.status === "COMPLETED").length,
    progress: 45 // Dummy
  },
  zones: db_zones.map(z => ({
    id: z.zoneId,
    name: zoneNames[z.zoneId],
    status: (z.zoneId === 3 ? "CRITICAL" : "STABLE") as any
  }))
};
