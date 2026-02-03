// src/services/task.api.ts
import { useAuthStore } from "@/stores/authStore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

// ✅ 토트 연결(저장) API
export async function attachToteToTask(taskId: number, toteBarcode: string) {
  const token = useAuthStore.getState().token;

  const res = await fetch(`/api/tasks/${taskId}/totes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ toteBarcode }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.errorMessage ||
      "토트 저장(연결)에 실패했습니다.";
    throw new Error(msg);
  }

  // 백이 공통응답이면 여기서 success도 체크
  const wrapped = data as Partial<ApiResponse<any>>;
  if (wrapped && typeof wrapped.success === "boolean" && !wrapped.success) {
    throw new Error(wrapped.message ?? "토트 저장(연결)에 실패했습니다.");
  }

  return data;
}
