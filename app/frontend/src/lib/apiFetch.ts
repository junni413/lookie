// src/lib/apiFetch.ts
import { useAuthStore } from "@/stores/authStore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

let refreshing: Promise<void> | null = null;

async function doRefresh() {
  const { refreshToken, user, login, logout } = useAuthStore.getState();

  if (!refreshToken) throw new Error("No refreshToken");

  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Refresh-Token": refreshToken, // ✅ 백엔드 요구 헤더
    },
  });

  const json = (await res.json().catch(() => ({}))) as ApiResponse<{
    accessToken: string;
    refreshToken: string;
  }>;

  if (!res.ok || !json?.success) {
    logout();
    throw new Error(json?.message ?? "Refresh failed");
  }

  // user 정보는 그대로 두고 토큰만 교체 (RTR)
  if (!user) {
    logout();
    throw new Error("No user in store");
  }

  login({
    token: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    user,
  });
}

/**
 * apiFetch: fetch 래퍼
 * - 자동 Authorization 주입
 * - 401이면 refresh 후 1회 재시도
 */
export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // JSON 바디면 Content-Type 붙이기 (이미 있으면 유지)
  if (!headers["Content-Type"] && init.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && retry) {
    // refresh는 동시에 여러 요청이 와도 1번만 돌도록 잠금
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    await refreshing;

    // 토큰 갱신 후 1회 재시도
    return apiFetch<T>(url, init, false);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error("API Error");
    err.response = { status: res.status, data };
    throw err;
  }

  return data as T;
}

