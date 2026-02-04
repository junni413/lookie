// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";
import type {
  AdminIssueListRequest,
  AdminIssueListResponse,
  IssueDetailData
} from "../types/issue";

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
   * 관리자 관제 이슈 목록 조회 (GET /api/issues)
   */
  getIssues: async (params: AdminIssueListRequest): Promise<AdminIssueListResponse> => {
    // [MOCK MODE] Real API call commented out
    /*
    const query = new URLSearchParams({
      status: params.status,
      page: (params.page || 1).toString(),
      size: (params.size || 10).toString(),
    });

    const response = await requestJSON<ApiResponse<AdminIssueListResponse>>(`/api/issues?${query.toString()}`, {
      method: "GET",
    });

    return response.data;
    */

    const { mockIssueSummaries } = await import("@/mocks/issueMocks");
    const filtered = mockIssueSummaries.filter(i => i.status === params.status);

    return {
      issues: filtered,
      paging: {
        page: params.page || 1,
        size: params.size || 10,
        totalCount: filtered.length,
        totalPages: 1
      }
    };
  },

  /**
   * 이슈 상세 조회 (GET /api/issues/:id)
   */
  getIssueDetail: async (issueId: number): Promise<IssueDetailData> => {
    // [MOCK MODE] Real API call commented out
    /*
    const response = await requestJSON<ApiResponse<IssueDetailData>>(`/api/issues/${issueId}`, {
      method: "GET",
    });
    return response.data;
    */

    const { mockIssueDetails } = await import("@/mocks/issueMocks");
    const detail = mockIssueDetails[issueId];
    if (!detail) throw new Error("Mock issue not found");
    return detail;
  },

  /**
   * 이슈 확정 (POST /api/issues/:id/admin/confirm)
   */
  confirmIssue: async (issueId: number, body: AdminConfirmRequest): Promise<void> => {
    console.log(`[MOCK] Confirmed issue ${issueId}:`, body);
    /*
    await requestJSON(`/api/issues/${issueId}/admin/confirm`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    */
  },
};
