import type { ApiResponse, TaskResponse, TaskVO, TaskItemVO } from "../types/task";
import type { DB_BatchTask } from "@/types/db";
import {
  db_batch_tasks,
  db_batch_task_items,

  db_users,
  db_products,
  zoneNames
} from "@/mocks/mockData";

/** -----------------------------
 * Issue (로컬 저장용 - Mocking IssueService and TaskService overlap)
 * ----------------------------- */
export type TaskIssueStatus = "DONE" | "WAIT";

// Keep Issue interface for local storage compatibility or refactor to DB_Issue?
// For now, let's map DB_Issue to this if needed, or keep separate "local pending issues".
export interface Issue {
  id: string;
  title: string;
  location: string;
  createdAt: string;
  status: TaskIssueStatus;
  imageUrl?: string;
  productName: string;
  sku: string;
  aiResult?: string;
  verdict?: string;
}

/** -----------------------------
 * HTTP Helper
 * ----------------------------- */
const TOKEN_KEY = "accessToken";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function requestJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const e: any = new Error((data as any)?.message ?? "API Error");
    e.response = { status: res.status, data };
    throw e;
  }

  return data as T;
}

/** -----------------------------
 * Helper to Map DB_BatchTask -> TaskVO
 * ----------------------------- */
function mapToTaskVO(task: DB_BatchTask): TaskVO {
  const zoneName = zoneNames[task.zone_id] || "Unknown";
  // Count items
  const items = db_batch_task_items.filter(i => i.batch_task_id === task.batch_task_id);

  return {
    batchTaskId: task.batch_task_id,
    batchId: task.batch_id,
    zoneId: task.zone_id,
    workerId: task.worker_id || undefined,
    toteId: task.tote_id || undefined,
    status: task.status,
    startedAt: task.started_at || undefined,
    completedAt: task.completed_at || undefined,
    currentLocationId: task.current_location_id || undefined,
    toteScannedAt: task.tote_scanned_at || undefined,
    toteReleasedAt: task.tote_released_at || undefined,
    actionStatus: task.action_status,
    locationScannedAt: task.location_scanned_at || undefined,
    // UI Fields
    displayZone: zoneName,
    displayLine: "L1", // Mock
    itemCount: items.length
  };
}

/** -----------------------------
 * taskService
 * ----------------------------- */
export const taskService = {
  /** [MOCKING] 작업 할당 및 시작 */
  startTask: async (): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
    // Find a task for current user (assumed from token or context, but here we just pick one)
    // For demo, let's pick the first IN_PROGRESS task.
    const task = db_batch_tasks.find(t => t.status === "IN_PROGRESS");

    if (!task) {
      return {
        success: false,
        message: "No tasks available",
        errorCode: "TASK_004",
        data: {} as any
      };
    }

    const vo = mapToTaskVO(task);
    const workerName = db_users.find(u => u.user_id === task.worker_id)?.name || "Worker";

    return {
      success: true,
      message: "SUCCESS",
      data: {
        payload: { ...vo, workerName } as any,
        nextAction: task.action_status as any // Map if needed
      }
    };
  },

  /** 토트 등록(스캔) */
  scanTote: async (taskId: number, barcode: string): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
    // Check local mock first? Or assumes API. 
    // If Mock mode, update DB
    const task = db_batch_tasks.find(t => t.batch_task_id === taskId);
    if (task) {
      task.action_status = "SCAN_LOCATION";
      // task.tote_id = ... find from db_totes
    }

    return requestJSON(`/api/tasks/${taskId}/totes`, {
      method: "POST",
      body: JSON.stringify({ barcode }),
    });
  },

  /** 지번 검증 */
  scanLocation: async (taskId: number, locationCode: string): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
    return requestJSON(`/api/tasks/${taskId}/locations/check`, {
      method: "POST",
      body: JSON.stringify({ locationCode }),
    });
  },

  /** 상품 스캔 + 수량 1 증가 */
  scanItem: async (taskId: number, barcode: string): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
    return requestJSON(`/api/tasks/${taskId}/items/scan`, {
      method: "POST",
      body: JSON.stringify({ barcode }),
    });
  },

  /** 수량 수정 */
  updateQuantity: async (itemId: number, increment: number): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
    return requestJSON(`/api/tasks/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ increment }),
    });
  },

  /** 상품별 집품 완료 */
  completeItem: async (itemId: number): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
    return requestJSON(`/api/tasks/items/${itemId}/complete`, { method: "POST" });
  },

  /** 작업 완료 */
  completeTask: async (taskId: number): Promise<ApiResponse<{}>> => {
    return requestJSON(`/api/tasks/${taskId}/complete`, { method: "POST" });
  },

  /** 작업 아이템 목록 조회 */
  getTaskItems: async (taskId: number): Promise<ApiResponse<TaskItemVO[]>> => {
    // Mock return
    const items = db_batch_task_items.filter(i => i.batch_task_id === taskId);
    const res: TaskItemVO[] = items.map(i => {
      const prod = db_products.find(p => p.product_id === i.product_id);
      return {
        batchTaskItemId: i.batch_task_item_id,
        batchTaskId: i.batch_task_id,
        productId: i.product_id,
        locationId: i.location_id,
        requiredQty: i.required_qty,
        pickedQty: i.picked_qty,
        status: i.status,
        productName: prod?.product_name || "Unknown",
        barcode: prod?.barcode || "",
        locationCode: "A-01-01" // Mock
      };
    });

    return {
      success: true,
      message: "OK",
      data: res
    };
    // Once API is real, use:
    // return requestJSON(`/api/tasks/${taskId}/items`, { method: "GET" });
  },

  /** -----------------------------
   * UI용 로컬 기능 (이슈 관리 MOCK)
   * ----------------------------- */
  // ... Keep existing local storage mock logic for now as it's purely UI state ...

  addWaitingTasks: async (_count: number): Promise<void> => {
    // no-op
  },

  getWorkStats: async () => {
    return { done: 10, issue: 2, waiting: 5 };
  },

  reportIssue: async (_payload?: any): Promise<string> => {
    // Add to db_issues (in memory)
    const newId = Date.now();
    // ...
    return "ISS-" + newId;
  },

  uploadIssueImage: async (issueId: string, file: File): Promise<void> => {
    console.warn("⚠️ [MOCK] uploadIssueImage:", issueId, file.name);
  },

  updateIssueResult: async (
    _issueId: string,
    _patch: { verdict?: string; imageUrl?: string; status: TaskIssueStatus; aiResult?: string }
  ): Promise<void> => {
    // no-op
  },

  getMyIssues: async (): Promise<Issue[]> => {
    return [];
  },
};
