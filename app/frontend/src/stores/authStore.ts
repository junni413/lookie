import { create } from "zustand";
import { apiFetch } from "@/lib/apiFetch";
import type { DB_User, UserRole } from "@/types/db";

// Use DB_User directly.
export type User = DB_User;

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  user: DB_User | null;

  login: (payload: { token: string; refreshToken: string; user: DB_User }) => void;
  logout: () => void;

  fetchMe: () => Promise<void>;
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
    return raw ? (JSON.parse(raw) as DB_User) : null;
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
    const token = get().token;
    if (!token) return;

    try {
      const res = await apiFetch<ApiResponse<any>>("/api/users/me", {
        method: "GET",
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      const d = res.data;

      // MAP API response to DB_User (Both now camelCase)
      const nextUser: DB_User = {
        userId: d.userId,
        role: d.role ?? (get().role ?? "WORKER"),
        passwordHash: "",
        name: d.name,
        phoneNumber: d.phoneNumber,
        email: d.email,
        birthDate: d.birthDate,
        isActive: d.isActive ?? true,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        assignedZoneId: d.assignedZoneId ?? null,
      };

      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(ROLE_KEY, nextUser.role);

      set({ user: nextUser, role: nextUser.role });
    } catch (e) {
      console.error("fetchMe Error:", e);
      // Optional: Logout if invalid token?
    }
  },
}));
