import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore, type UserRole } from "./stores/authStore";

import AdminLayout from "./components/layout/AdminLayout";
import MobileLayout from "./components/layout/MobileLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import WorkerHome from "./pages/worker/Home";
import AdminDashboard from "./pages/admin/Dashboard";

// ✅ 인증 가드: token 없으면 /login
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ✅ 역할 가드: role 없으면 /login, role 다르면 해당 role 홈으로
function RequireRole({
  allow,
  children,
}: {
  allow: UserRole;
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.role);

  if (!role) return <Navigate to="/login" replace />;

  if (role !== allow) {
    return (
      <Navigate
        to={role === "WORKER" ? "/worker/home" : "/admin/dashboard"}
        replace
      />
    );
  }

  return <>{children}</>;
}

// ✅ 루트 진입(/): token/role 있으면 해당 홈으로, 아니면 /login
function IndexRedirect() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token || !role) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={role === "WORKER" ? "/worker/home" : "/admin/dashboard"}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      {/* 기본 진입 */}
      <Route path="/" element={<IndexRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* WORKER */}
      <Route
        path="/worker"
        element={
          <RequireAuth>
            <RequireRole allow="WORKER">
              <MobileLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<WorkerHome />} />
        {/* 필요하면 여기 아래로 worker 라우트 추가 */}
        {/* <Route path="attend" element={<Attend />} /> */}
      </Route>

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole allow="ADMIN">
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        {/* 필요하면 여기 아래로 admin 라우트 추가 */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
