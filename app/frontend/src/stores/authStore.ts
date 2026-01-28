import { create } from "zustand";

export type UserRole = "WORKER" | "ADMIN";

type AuthState = {
  token: string | null;
  role: UserRole | null;

  // actions
  login: (payload: { token: string; role: UserRole }) => void;
  logout: () => void;

  // selectors(편의)
  isAuthed: () => boolean;
  isWorker: () => boolean;
  isAdmin: () => boolean;
};

const TOKEN_KEY = "accessToken";
const ROLE_KEY = "userRole";

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  role: (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? null,

  login: ({ token, role }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    set({ token, role });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    set({ token: null, role: null });
  },

  isAuthed: () => Boolean(get().token),
  isWorker: () => get().role === "WORKER",
  isAdmin: () => get().role === "ADMIN",
}));
