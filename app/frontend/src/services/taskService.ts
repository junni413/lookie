import type { ApiResponse, TaskResponse, TaskVO, TaskItemVO } from "../types/task";

/** -----------------------------
 * Issue (로컬 저장용)
 * ----------------------------- */
export type IssueStatus = "DONE" | "WAIT";

export interface Issue {
  id: string;
  title: string;
  location: string;
  createdAt: string;
  status: IssueStatus; // "OPEN", "RESOLVED"
  imageUrl?: string;
  productName: string;
  sku: string;
  aiResult?: string; // "MISSING", "WAIT", "ADMIN", "LOCATION_MOVE"
  verdict?: string;  // "OK", "DAMAGED", "NEED_REVIEW"
}

/** -----------------------------
 * HTTP Helper (Task API에만 사용)
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
 * Local stats helpers
 * ----------------------------- */
function getStats(): { done: number; issue: number; waiting: number } {
  const statsStr = localStorage.getItem("work_stats");
  return statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
}

function setStats(stats: { done: number; issue: number; waiting: number }) {
  localStorage.setItem("work_stats", JSON.stringify(stats));
}

/** -----------------------------
 * taskService (Task는 API / Issue는 MOCK)
 * ----------------------------- */
export const taskService = {
  /** [MOCKING] 작업 할당 및 시작 */
  startTask: async (): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
    console.warn("⚠️ 현재 Mock 데이터를 사용 중입니다. (배정 구역 에러 패스)");

    // ✅ errorCode에 null 넣으면 타입에 따라 TS2322 날 수 있어서 아예 제거
    return {
      success: true,
      message: "SUCCESS",
      // errorCode: undefined, // 넣고 싶으면 undefined로 (대부분은 그냥 필드 제거가 안전)
      data: {
        payload: {
          batchTaskId: 1, // 임의의 ID
          zoneName: "테스트 구역-A",
          workerName: "관리자",
        } as any,
        nextAction: "SCAN_TOTE",
      } as any,
    } as any;
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
   * UI용 로컬 기능 (이슈 관리 MOCK)
   * ----------------------------- */

  addWaitingTasks: async (count: number): Promise<void> => {
    const stats = getStats();
    stats.waiting += count;
    setStats(stats);
  },

  getWorkStats: async () => {
    return getStats();
  },

  /** (MOCK) 이슈 생성 -> issueId 리턴 + my_issues에 저장 */
  reportIssue: async (payload?: any): Promise<string> => {
    const stats = getStats();
    stats.issue += 1;
    setStats(stats);

    const issuesStr = localStorage.getItem("my_issues");
    const issues: Issue[] = issuesStr ? JSON.parse(issuesStr) : [];

    const newId = `ISS-${String(issues.length + 1).padStart(3, "0")}`;

    const typeLabel =
      payload?.type ??
      (payload?.issueType === "DAMAGED" ? "파손" : payload?.issueType === "MISSING" ? "재고없음" : "기타");

    const newIssue: Issue = {
      id: newId,
      title: payload ? `${typeLabel} 신고` : "기타 이슈 신고",
      location: payload?.location ?? "알 수 없음",
      productName: payload?.productName ?? "기타 상품",
      sku: payload?.sku ?? "OTHER",
      createdAt: new Date().toLocaleString("ko-KR"),
      status: "WAIT",
      aiResult: payload?.aiResult,
      verdict: payload?.verdict,
      imageUrl: payload?.imageUrl,
    };

    issues.unshift(newIssue);
    localStorage.setItem("my_issues", JSON.stringify(issues));
    return newId;
  },

  /** (MOCK) 이슈 이미지 업로드: 실제 업로드 없이 “업로드됨” 동작만 흉내 */
  uploadIssueImage: async (issueId: string, file: File): Promise<void> => {
    console.warn("⚠️ [MOCK] uploadIssueImage:", issueId, file.name);
    // 실제 파일은 localStorage에 넣기 어려우니 no-op
  },

  /** (MOCK) AI 결과/상태 업데이트: my_issues에서 해당 이슈 찾아 patch
   * ✅ verdict는 AiStockAnalysis 등에서 없을 수 있어서 optional 처리
   */
  updateIssueResult: async (
    issueId: string,
    patch: { verdict?: string; imageUrl?: string; status: IssueStatus; aiResult?: string }
  ): Promise<void> => {
    const issuesStr = localStorage.getItem("my_issues");
    const issues: Issue[] = issuesStr ? JSON.parse(issuesStr) : [];

    const next = issues.map((it) => (it.id === issueId ? { ...it, ...patch } : it));
    localStorage.setItem("my_issues", JSON.stringify(next));
  },

  getMyIssues: async (): Promise<Issue[]> => {
    const issuesStr = localStorage.getItem("my_issues");
    return issuesStr ? JSON.parse(issuesStr) : [];
  },
};
