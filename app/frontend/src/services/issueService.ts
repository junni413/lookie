// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";
import type { IssueResponse } from "@/types/db";
import {
  db_issues,
  db_issue_images,
  db_ai_judgments,
  db_users,
  zoneNames,
  getDerivedWorker,
} from "@/mocks/mockData";

/** -----------------------------
 * HTTP Helper
 * ----------------------------- */
/** -----------------------------
 * Helpers for Mock
 * ----------------------------- */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getJoinedIssues = (): IssueResponse[] => {
  return db_issues.map((issue) => {
    const workerUser = db_users.find((u) => u.userId === issue.workerId);
    const workerName = workerUser ? workerUser.name : "알 수 없음";

    const zoneName = zoneNames[issue.zoneLocationId || 1] || "Unknown Zone";
    const images = db_issue_images.filter((img) => img.issueId === issue.issueId);
    const judgment = db_ai_judgments.find((j) => j.issueId === issue.issueId);

    const worker = getDerivedWorker(issue.workerId);

    if (!worker) {
      return {
        ...issue,
        workerName,
        zoneName,
        images,
        judgment: judgment!,
        worker: workerUser as any,
      } as IssueResponse;
    }

    return {
      ...issue,
      workerName,
      zoneName,
      images,
      judgment: judgment!,
      worker,
    };
  });
};

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

  // ❗ FormData일 때는 Content-Type을 직접 지정하면 안 됨 (boundary 자동 설정)
  if (init.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** -----------------------------
 * Types (Swagger 기준)
 * ----------------------------- */

export type CreateIssueRequest = {
  batchTaskId: number;
  batchTaskItemId: number;
  issueType: string; // "DAMAGED" | "MISSING" | "OTHER"
  imageUrl: string;
};

export type CreateIssueResponseData = {
  issueId: number;
  issueType: string;
  status: string;
  batchTaskId: number;
  batchTaskItemId: number;
  urgency: number;
  issueHandling: string;
};

export type IssueDetail = {
  issueId: number;
  type: string;
  status: string;
  priority: string;
  issueHandling: string;
  adminRequired: boolean;
  reasonCode: string;
  urgency: number;
  adminDecision: string;
  aiResult: string;
  confidence: number;
  summary: string;
  workerNextAction: string;
  issueNextAction: string;
  adminNextAction: string;
  availableActions: string[];
  // Extra fields for UI
  productName?: string;
  issueType?: string; // Add this line
  locationCode?: string;
  imageUrl?: string;
  createdAt?: string;
  verdict?: string; // AI Verdict
  sku?: string;
};

export type MyIssueResponse = {
  issueId: number;
  issueType: string;
  status: string; // "OPEN" | "RESOLVED"
  productName: string;
  locationCode: string;
  aiDecision: string;
  adminRequired: boolean;
  createdAt: string;
};

/** -----------------------------
 * issueService
 * ----------------------------- */
export const issueService = {
  /** ✅ 이미지 업로드 → imageUrl(string) 반환 */
  uploadImage: async (file: File): Promise<ApiResponse<string>> => {
    const form = new FormData();
    form.append("file", file);

    return requestJSON(`/api/uploads/images`, {
      method: "POST",
      body: form,
    });
  },

  /** ✅ 이슈 생성 */
  createIssue: async (body: CreateIssueRequest): Promise<ApiResponse<CreateIssueResponseData>> => {
    return requestJSON(`/api/issues`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** ✅ 이슈 상세 조회 */
  getIssue: async (issueId: number): Promise<ApiResponse<IssueDetail>> => {
    return requestJSON(`/api/issues/${issueId}`, { method: "GET" });
  },

  getMyIssues: async (status?: "OPEN" | "RESOLVED"): Promise<ApiResponse<MyIssueResponse[]>> => {
    const qs = status ? `?status=${status}` : "";
    return requestJSON(`/api/issues/my${qs}`, { method: "GET" });
  },

  /** ✅ 재촬영 요청 (AI 재분석) */
  retakeIssue: async (issueId: number, imageUrl: string): Promise<ApiResponse<void>> => {
    return requestJSON(`/api/issues/${issueId}/ai/retake`, {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    });
  },

  /**
   * 이슈 목록 조회 (Mock: GET /api/admin/issues)
   */
  getIssues: async (params?: {
    page?: number;
    size?: number;
    status?: "OPEN" | "RESOLVED";
    sort?: "TIME" | "PRIORITY";
  }): Promise<{ data: IssueResponse[]; total: number }> => {
    await delay(500);
    let all = getJoinedIssues();

    if (params?.status) {
      all = all.filter((i) => i.status === params.status);
    }

    if (params?.sort) {
      if (params.sort === "PRIORITY") {
        const priorityMap: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        all.sort((a, b) => (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0));
      } else {
        if (params.status === "RESOLVED") {
          all.sort((a, b) => {
            const timeA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : new Date(a.createdAt).getTime();
            const timeB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : new Date(b.createdAt).getTime();
            return timeB - timeA;
          });
        } else {
          all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      }
    }

    const page = params?.page || 1;
    const size = params?.size || 10;
    const start = (page - 1) * size;
    const end = start + size;

    const paginated = all.slice(start, end);

    return {
      data: paginated,
      total: all.length,
    };
  },

  /**
   * 이슈 상세 조회 (Mock: GET /api/admin/issues/:id)
   */
  getIssueDetail: async (id: number): Promise<IssueResponse | null> => {
    await delay(300);
    const all = getJoinedIssues();
    const issue = all.find((i) => i.issueId === id);
    return issue || null;
  },

  /**
   * 이슈 확정 (Mock: PATCH /api/admin/issues/:id)
   */
  processIssue: async (id: number, decision: "APPROVED" | "REJECTED"): Promise<void> => {
    await delay(800);

    const target = db_issues.find((i) => i.issueId === id);
    if (target) {
      target.status = "RESOLVED";
      target.resolvedAt = new Date().toISOString();
      if (decision === "APPROVED") {
        target.issueHandling = "NON_BLOCKING";
      } else {
        target.issueHandling = "BLOCKING";
      }
    }
  },
};
