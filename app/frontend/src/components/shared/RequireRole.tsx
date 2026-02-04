import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { DEFAULT_ROUTE_BY_ROLE } from "@/config/roleRoute";
import type { UserRole } from "@/types/db";
import type { ReactNode } from "react";

type RequireRoleProps = {
  role: UserRole;
  children: ReactNode;
  loginPath?: string;
};

export default function RequireRole({
  role,
  children,
  loginPath = "/",
}: RequireRoleProps) {
  const location = useLocation();

  // ✅ store에서 필요한 값만 selector로 가져오기
  const token = useAuthStore((s) => s.token);
  const userRole = useAuthStore((s) => s.role);

  // 1) 비로그인
  if (!token || !userRole) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // 2) 권한 불일치
  if (userRole !== role) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[userRole]} replace />;
  }

  return <>{children}</>;
}
