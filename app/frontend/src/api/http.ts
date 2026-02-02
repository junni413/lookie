type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
};

export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token: customToken } = options;

  // localStorage에서 토큰 가져오기 (전역 자동 주입)
  const token = customToken || localStorage.getItem("accessToken");

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error("API Error");
    err.response = { status: res.status, data };
    throw err;
  }

  return data as T;
}
