// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";
import type {
  AdminIssueListRequest,
  AdminIssueListResponse,
  IssueDetailData
} from "../types/issue";

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

  // ❗ FormData일 때는 Content-Type 직접 지정 금지 (boundary 자동)
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

  // UI 보조 필드
  productName?: string;
  issueType?: string;
  locationCode?: string;
  imageUrl?: string;
  createdAt?: string;
  verdict?: string;
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
 * issueService (Real API Only)
 * ----------------------------- */

export const issueService = {
  /** ✅ 이미지 업로드 → imageUrl 반환 */
  uploadImage: async (file: File): Promise<ApiResponse<string>> => {
    const form = new FormData();
    form.append("file", file);

    return requestJSON(`/api/uploads/images`, {
      method: "POST",
      body: form,
    });
  },

  /** ✅ 이슈 생성 */
  createIssue: async (
    body: CreateIssueRequest
  ): Promise<ApiResponse<CreateIssueResponseData>> => {
    return requestJSON(`/api/issues`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** ✅ 이슈 상세 조회 (AI 결과 포함) */
  getIssue: async (issueId: number): Promise<ApiResponse<IssueDetail>> => {
    return requestJSON(`/api/issues/${issueId}`, {
      method: "GET",
    });
  },

  /** ✅ 내 이슈 목록 조회 */
  getMyIssues: async (
    status?: "OPEN" | "RESOLVED"
  ): Promise<ApiResponse<MyIssueResponse[]>> => {
    const qs = status ? `?status=${status}` : "";
    return requestJSON(`/api/issues/my${qs}`, {
      method: "GET",
    });
  },

  /** ✅ 재촬영 요청 (AI 재분석) */
  retakeIssue: async (
    issueId: number,
    imageUrl: string
  ): Promise<ApiResponse<void>> => {
    return requestJSON(`/api/issues/${issueId}/ai/retake`, {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    });
  },
};