import { create } from "zustand";

export type UserRole = "WORKER" | "ADMIN";

export type User = {
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  birthDate?: string; // LocalDate → string
  role: UserRole;
  isActive?: boolean;
};

type AuthState = {
  token: string | null;
  role: UserRole | null;
  user: User | null;

  // actions
  login: (payload: { token: string; user: User }) => void;
  logout: () => void;

  // 내 정보 재조회
  fetchMe: () => Promise<void>;

  // selectors
  isAuthed: () => boolean;
  isWorker: () => boolean;
  isAdmin: () => boolean;
};

const TOKEN_KEY = "accessToken";
const ROLE_KEY = "userRole";
const USER_KEY = "authUser";

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  role: (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? null,
  user: (() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  })(),

  login: ({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, user.role);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, role: user.role, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, role: null, user: null });
  },

  /**
   * GET /api/users/me
   * 응답: ApiResponse<User>
   */
  fetchMe: async () => {
    const token = get().token;
    if (!token) return;

    const res = await fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 토큰 만료 or 비정상 → 로그아웃
      get().logout();
      return;
    }

    const json = await res.json().catch(() => ({}));
    const me = json?.data as User | undefined; // ✅ ApiResponse 기준

    if (!me) return;

    localStorage.setItem(USER_KEY, JSON.stringify(me));
    localStorage.setItem(ROLE_KEY, me.role);
    set({ user: me, role: me.role });
  },

  isAuthed: () => Boolean(get().token),
  isWorker: () => get().role === "WORKER",
  isAdmin: () => get().role === "ADMIN",
}));
