// app/frontend/src/services/issueService.ts
import type { ApiResponse } from "../types/task";
import type {
  AdminIssueListRequest,
  AdminIssueListResponse,
  IssueDetailData
} from "../types/issue";

export type { AdminIssueListRequest, AdminIssueListResponse, IssueDetailData };

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
  issueType: string; // "DAMAGED" | "OUT_OF_STOCK"
  imageUrl?: string;
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

// IssueDetailData from types/issue.ts is used instead

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

  // Unified with getIssueDetail

  /** ✅ 내 이슈 목록 조회 */
  getMyIssues: async (
    status?: "OPEN" | "RESOLVED"
  ): Promise<ApiResponse<MyIssueResponse[]>> => {
    const qs = status ? `?status=${status}` : "";
    const response = await requestJSON<ApiResponse<MyIssueResponse[]>>(`/api/issues/my${qs}`, {
      method: "GET",
    });

    if (response.success && Array.isArray(response.data)) {
      return {
        ...response,
        data: response.data.map((it: any) => ({
          ...it,
          issueType: it.issueType || it.type,
        })),
      };
    }
    return response;
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

  /** ✅ Admin: 이슈 목록 조회 */
  getIssues: async (
    params?: AdminIssueListRequest
  ): Promise<AdminIssueListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", String(params.page));
    if (params?.size) qs.append("size", String(params.size));
    if (params?.status) qs.append("status", params.status);
    if (params?.sortType) qs.append("sortType", params.sortType);

    const queryString = qs.toString();
    const url = `/api/issues${queryString ? `?${queryString}` : ""}`;

    const response = await requestJSON<ApiResponse<AdminIssueListResponse & { paging: { totalCount: number } }>>(url, { method: "GET" });
    
    // Check if data exists and map totalCount to total for frontend consistency
    if (response.data) {
      return {
        issues: response.data.issues || [],
        paging: {
          total: response.data.paging.totalCount || 0,
          page: response.data.paging.page || 1,
          size: response.data.paging.size || 10
        }
      };
    }
    
    return { issues: [], paging: { total: 0, page: 1, size: 10 } };
  },

  /** ✅ Admin: 이슈 상세 조회 */
  getIssueDetail: async (issueId: number): Promise<IssueDetailData | null> => {
    try {
      const response = await requestJSON<ApiResponse<IssueDetailData>>(
        `/api/issues/${issueId}`,
        { method: "GET" }
      );
      
      if (response.data) {
        // 백엔드와의 타입 혼용 방지를 위해 issueType으로 통일
        const data = response.data;
        return {
          ...data,
          issueType: data.issueType || data.type // 'type' 필드가 올 경우 'issueType'으로 매핑
        };
      }
      return null;
    } catch (err) {
      console.error(`Failed to fetch issue detail for ${issueId}`, err);
      return null;
    }
  },

  /** ✅ Admin: 이슈 확정 */
  confirmIssue: async (
    issueId: number,
    body: { adminDecision: string }
  ): Promise<void> => {
    await requestJSON(`/api/issues/${issueId}/admin/confirm`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};