import type { UserRole } from "@/types/db";

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  WORKER: "/worker/home",
};