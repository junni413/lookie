import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore, type UserRole } from "./stores/authStore";

import MobileLayout from "./components/layout/MobileLayout";
import Login from "./pages/auth/Login";
import WorkerHome from "./pages/worker/Home";
import AdminDashboard from "./pages/admin/Dashboard";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  allow,
  children,
}: {
  allow: UserRole;
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.role);

  // role이 아직 없거나 깨진 경우 -> 로그인으로
  if (!role) return <Navigate to="/login" replace />;

  // role 불일치 -> 해당 role 홈으로 보내기
  if (role !== allow) {
    return <Navigate to={role === "WORKER" ? "/worker/home" : "/admin/dashboard"} replace />;
  }

  return <>{children}</>;
}

function IndexRedirect() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token || !role) return <Navigate to="/login" replace />;
  return <Navigate to={role === "WORKER" ? "/worker/home" : "/admin/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* 기본 진입 */}
      <Route path="/" element={<IndexRedirect />} />

      {/* 로그인 */}
      <Route path="/login" element={<Login />} />

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
        <Route path="home" element={<WorkerHome />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole allow="ADMIN">
              {/* AdminLayout이 있으면 여기 교체 */}
              <div className="min-h-screen bg-gray-50">
                <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-white shadow-sm p-4">
                  {/* 임시 AdminLayout */}
                  <AdminDashboard />
                </div>
              </div>
            </RequireRole>
          </RequireAuth>
        }
      >
        {/* 나중에 AdminLayout 만들면 Outlet 구조로 바꾸면 됨 */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
