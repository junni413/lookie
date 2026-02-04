// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";
import {
  db_issues,
  db_issue_images,
  db_ai_judgments,
  db_users,
  zoneNames,
} from "@/mocks/mockData";
import { getDerivedWorker } from "@/mocks/mockData";
import type { IssueResponse } from "@/types/db";

/** -----------------------------
 * HTTP Helper (Issue API 전용)
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

  return data as T;
}

/** -----------------------------
 * Mock helpers (Admin Issue 화면용)
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
 * Swagger 기반 타입
 * ----------------------------- */

/** POST /api/issues - request */
export type CreateIssueRequest = {
  batchTaskId: number;
  batchTaskItemId: number;
  issueType: string; // enum이면 "DAMAGED" | "MISSING" | ...
  imageUrl: string;
};

/** POST /api/issues - response.data */
export type CreateIssueResponseData = {
  issueId: number;
  issueType: string;
  status: string;
  batchTaskId: number;
  batchTaskItemId: number;
  urgency: number;
  issueHandling: string;
};

/** POST /api/issues/{issueId}/ai/retake - request */
export type RetakeAiRequest = {
  imageUrl: string;
};

/** POST /api/issues/{issueId}/ai/result - request */
export type AiResultRequest = {
  aiDecision: string;
  reasonCode: string;
  confidence: number;
  summary: string;
  aiResult: string;
  newLocation: {
    zoneLocationId: number;
    locationCode: string;
  };
};

/** POST /api/issues/{issueId}/ai/result - response.data */
export type AiResultResponseData = {
  issueId: number;
  status: string;
  urgency: number;
  issueHandling: string;
  adminRequired: boolean;
  reasonCode: string;
  resolvedAt: string; // ISO string
  nextAction: string; // "NEXT_ITEM" 등
};

/** POST /api/issues/{issueId}/admin/confirm - request */
export type AdminConfirmRequest = {
  adminDecision: "NORMAL" | string; // enum이면 "NORMAL" | "DAMAGED" ...
};

/** GET /api/issues/{issueId} - response.data */
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
};

/** -----------------------------
 * issueService (Issue API only)
 * ----------------------------- */
export const issueService = {
  /** 이슈 등록 */
  createIssue: async (body: CreateIssueRequest): Promise<ApiResponse<CreateIssueResponseData>> => {
    return requestJSON(`/api/issues`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 이슈 재촬영(AI 판단 재요청) */
  retakeAi: async (issueId: number, body: RetakeAiRequest): Promise<ApiResponse<{}>> => {
    return requestJSON(`/api/issues/${issueId}/ai/retake`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * AI 판정 결과 수신 (Webhook)
   * 현재 백엔드가 호출하는 용도지만,
   * 개발/테스트용으로 프론트에서 직접 호출할 수도 있음.
   */
  submitAiResult: async (issueId: number, body: AiResultRequest): Promise<ApiResponse<AiResultResponseData>> => {
    return requestJSON(`/api/issues/${issueId}/ai/result`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 관리자 확정 */
  adminConfirm: async (issueId: number, body: AdminConfirmRequest): Promise<ApiResponse<{}>> => {
    return requestJSON(`/api/issues/${issueId}/admin/confirm`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 이슈 상세 조회 */
  getIssue: async (issueId: number): Promise<ApiResponse<IssueDetail>> => {
    return requestJSON(`/api/issues/${issueId}`, { method: "GET" });
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
        const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        all.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
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
