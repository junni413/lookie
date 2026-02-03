// src/stores/authStore.ts
import { create } from "zustand";
import { apiFetch } from "@/lib/apiFetch";

export type UserRole = "WORKER" | "ADMIN";

export type User = {
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  birthDate?: string;
  role: UserRole;
  isActive?: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

type UserProfileResponse = {
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  birthDate: string | null;
  role: UserRole; // 백에서 내려준다고 가정(없으면 아래 매핑에서 보완 가능)
  isActive: boolean;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  user: User | null;

  login: (payload: { token: string; refreshToken: string; user: User }) => void;
  logout: () => void;

  fetchMe: () => Promise<void>; // ✅ 추가
};

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const ROLE_KEY = "userRole";
const USER_KEY = "authUser";

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  role: (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? null,
  user: (() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  })(),

  login: ({ token, refreshToken, user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(ROLE_KEY, user.role);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    set({ token, refreshToken, role: user.role, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);

    set({ token: null, refreshToken: null, role: null, user: null });
  },

  fetchMe: async () => {
    // 토큰 없으면 아무 것도 안 함
    const token = get().token;
    if (!token) return;

    const res = await apiFetch<ApiResponse<UserProfileResponse>>("/api/users/me", {
      method: "GET",
    });

    if (!res.success) {
      throw new Error(res.message);
    }

    const d = res.data;

    // ✅ 백 응답 기반으로 User로 맞춰 저장
    const nextUser: User = {
      userId: d.userId,
      name: d.name,
      phoneNumber: d.phoneNumber,
      email: d.email,
      birthDate: d.birthDate ?? undefined,
      role: d.role ?? (get().role ?? "WORKER"), // role이 혹시 안 오면 fallback
      isActive: d.isActive,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(ROLE_KEY, nextUser.role);

    set({ user: nextUser, role: nextUser.role });
  },
}));
