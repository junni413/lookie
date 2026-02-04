// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";

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
 * Swagger 기반 타입
 * ----------------------------- */

/** POST /api/issues - request */
export type CreateIssueRequest = {
  batchTaskId: number;
  batchTaskItemId: number;
  issueType: string; // enum이면 "DAMAGED" | "MISSING" | ... 로 좁힐 수 있음
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
  adminDecision: "NORMAL" | string; // enum 확실하면 "NORMAL" | "DAMAGED" ... 로 좁히기
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
  /** 이슈 신고 */
  createIssue: async (body: CreateIssueRequest): Promise<ApiResponse<CreateIssueResponseData>> => {
    return requestJSON(`/api/issues`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 이슈 재촬영 (AI 재분석 요청) */
  retakeAi: async (issueId: number, body: RetakeAiRequest): Promise<ApiResponse<{}>> => {
    return requestJSON(`/api/issues/${issueId}/ai/retake`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * AI 판정 결과 수신 (Webhook)
   * ⚠️ 원래는 AI 서버가 호출하는 용도라 프론트에서 직접 호출 안 할 수도 있음.
   * 하지만 시연/테스트용으로는 프론트에서 붙여도 무방.
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
};
