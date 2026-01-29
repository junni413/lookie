import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore, type UserRole } from "./stores/authStore";

import AdminLayout from "./components/layout/AdminLayout";
import MobileLayout from "./components/layout/MobileLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import WorkerAttend from "./pages/worker/Attend";
import WorkerHome from "./pages/worker/Home";
import MyPage from "./pages/worker/MyPage";
import ProfileEdit from "./pages/worker/ProfileEdit";
import WorkHistory from "./pages/worker/WorkHistory";
import IssueListPage from "./pages/worker/IssueList";

import AdminDashboard from "./pages/admin/pages/Dashboard";
import IssuePage from "./pages/admin/pages/Issue";

// ✅ 작업 흐름 (프론트만)
import TaskAssignLoading from "./pages/worker/task/TaskAssignLoading";
import TaskScanStart from "./pages/worker/task/TaskScanStart";
import ToteScan from "./pages/worker/task/ToteScan";
import WorkDetail from "./pages/worker/task/WorkDetail";

// ✅ 인증 가드: token 없으면 /login
function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ✅ 역할 가드: role 없으면 /login, role 다르면 해당 role 첫 화면으로
function RequireRole({
  allow,
  children,
}: {
  allow: UserRole;
  children: ReactNode;
}) {
  const role = useAuthStore((s) => s.role);

  if (!role) return <Navigate to="/login" replace />;

  if (role !== allow) {
    return (
      <Navigate
        to={role === "WORKER" ? "/worker/attend" : "/admin/dashboard"}
        replace
      />
    );
  }

  return <>{children}</>;
}

// ✅ 루트 진입(/): token/role 있으면 해당 첫 화면으로, 아니면 /login
function IndexRedirect() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token || !role) return <Navigate to="/login" replace />;

  return (
    <Navigate
      to={role === "WORKER" ? "/worker/attend" : "/admin/dashboard"}
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
        {/* 워커 기본 진입 */}
        <Route index element={<Navigate to="/worker/attend" replace />} />

        {/* 출근 */}
        <Route path="attend" element={<WorkerAttend />} />

        {/* 대시보드 */}
        <Route path="home" element={<WorkerHome />} />

        {/* ✅ 작업 흐름 */}
        <Route path="task/loading" element={<TaskAssignLoading />} />
        <Route path="task/scan-start" element={<TaskScanStart />} />

        {/* ✅ 토트 스캔(카메라) */}
        <Route path="task/tote-scan" element={<ToteScan />} />

        {/* ✅ 작업 상세(상품 정보 화면) */}
        <Route path="task/work-detail" element={<WorkDetail />} />

        {/* 사이드바 연결 페이지들 */}
        <Route path="mypage" element={<MyPage />} />
        <Route path="profile/edit" element={<ProfileEdit />} />
        <Route path="work-history" element={<WorkHistory />} />
        <Route path="issues" element={<IssueListPage />} />
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
        <Route path="issue" element={<IssuePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
