// app/frontend/src/services/taskService.ts
import type { ApiResponse, TaskResponse, TaskVO, TaskItemVO } from "../types/task";

/** -----------------------------
 * HTTP Helper (Task API 전용)
 * ----------------------------- */
const TOKEN_KEY = "accessToken";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

type ApiError = Error & {
  response?: {
    status: number;
    data: unknown;
  };
};

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
  const data: unknown = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: unknown }).message ?? "API Error")
        : "API Error";

    const err: ApiError = new Error(message);
    err.response = { status: res.status, data };
    throw err;
  }

  return data as T;
}

/** -----------------------------
 * Local stats helpers (UI용 통계)
 * ----------------------------- */
export type WorkStats = { done: number; issue: number; waiting: number };

function getStats(): WorkStats {
  const statsStr = localStorage.getItem("work_stats");
  return statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
}

function setStats(stats: WorkStats) {
  localStorage.setItem("work_stats", JSON.stringify(stats));
}

/** -----------------------------
 * Active Task types (Swagger 기준)
 * ----------------------------- */
export type ActiveTaskPayload = {
  batchTaskId: number;
  batchId: number;
  zoneId: number;
  workerId: number;
  toteId: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  currentLocationId: number | null;
  toteScannedAt: string | null;
  toteReleasedAt: string | null;
  actionStatus: string; // "SCAN_LOCATION" 등
  locationScannedAt: string | null;
};

// nextItem은 {} 또는 아이템일 수 있음
export type ActiveTaskNextItem =
  | {
      batchTaskItemId: number;
      batchTaskId: number;
      productId: number;
      locationId: number;
      requiredQty: number;
      pickedQty: number;
      status: string;
      completedAt: string | null;
      lastScannedAt: string | null;
      productName: string;
      barcode: string;
      locationCode: string;
    }
  | Record<string, never>;

export type ActiveTaskData = {
  payload: ActiveTaskPayload;
  nextAction: string;
  nextItem: ActiveTaskNextItem;
};

/** -----------------------------
 * taskService (Task API only)
 * ----------------------------- */
export const taskService = {
  /** ✅ 진행 중인 작업 조회 (복구용) */
  getMyActiveTask: async (): Promise<ApiResponse<ActiveTaskData>> => {
    return requestJSON(`/api/tasks/me/active`, { method: "GET" });
  },

  /** ✅ 작업 할당 및 시작 (실 API) */
  startTask: async (): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
    return requestJSON(`/api/tasks`, { method: "POST" });
  },

  /** 토트 등록(스캔) */
  scanTote: async (taskId: number, barcode: string): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
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
    return requestJSON(`/api/tasks/${taskId}/items`, { method: "GET" });
  },

  /** -----------------------------
   * UI용 로컬 통계 기능
   * ----------------------------- */

  /** 대기 통계 증가(작업 할당 시 UI용) */
  addWaitingTasks: async (count: number): Promise<void> => {
    const stats = getStats();
    stats.waiting += count;
    setStats(stats);
  },

  /** 홈 화면 통계 조회(UI용) */
  getWorkStats: async (): Promise<WorkStats> => {
    return getStats();
  },

  /** 통계 초기화(퇴근 등에서 사용 가능) */
  resetWorkStats: async (): Promise<void> => {
    setStats({ done: 0, issue: 0, waiting: 0 });
  },
};
