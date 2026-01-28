import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { DEFAULT_ROUTE_BY_ROLE } from "@/config/roleRoute";
import type { UserRole } from "@/stores/authStore";
import type { ReactNode } from "react";

type RequireRoleProps = {
  role: UserRole;
  children: ReactNode;
  loginPath?: string;
};

export default function RequireRole({
  role,
  children,
  loginPath = "/", // 임시
}: RequireRoleProps) {
  const location = useLocation();
  const { token, role: userRole, isAuthed } = useAuthStore();

  // 1. 비로그인 → 로그인 페이지
  if (!isAuthed() || !token || !userRole) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location }}
      />
    );
  }

  // 2. 역할 불일치 → 해당 역할의 기본 랜딩 페이지
  if (userRole !== role) {
    return (
      <Navigate
        to={DEFAULT_ROUTE_BY_ROLE[userRole]}
        replace
      />
    );
  }

  // 3.통과
  return <>{children}</>; 
}