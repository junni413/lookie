import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore, type UserRole } from "./stores/authStore";

import AdminLayout from "./components/layout/AdminLayout";
import MobileLayout from "./components/layout/MobileLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// WORKER pages
import WorkerAttend from "./pages/worker/Attend";
import WorkerHome from "./pages/worker/Home";
import MyPage from "./pages/worker/MyPage";
import ProfileEdit from "./pages/worker/ProfileEdit";
import WorkHistory from "./pages/worker/WorkHistory";
import IssueListPage from "./pages/worker/issue/IssueList";
import IssueReportPage from "./pages/worker/issue/IssueReport";
import IssueResultPage from "./pages/worker/issue/IssueResult";

// WORKER task flow
import TaskAssignLoading from "./pages/worker/task/TaskAssignLoading";
import TaskScanStart from "./pages/worker/task/TaskScanStart";
import ToteScan from "./pages/worker/task/ToteScan";
import WorkDetail from "./pages/worker/task/WorkDetail";

// ADMIN pages (현재 구조 유지)
import AdminDashboard from "./pages/admin/pages/Dashboard";
import IssuePage from "./pages/admin/pages/Issue";

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

        {/* 홈 */}
        <Route path="home" element={<WorkerHome />} />

        {/* 작업 흐름 */}
        <Route path="task/loading" element={<TaskAssignLoading />} />
        <Route path="task/scan-start" element={<TaskScanStart />} />
        <Route path="task/tote-scan" element={<ToteScan />} />
        <Route path="task/work-detail" element={<WorkDetail />} />

        {/* ✅ 이슈(목록/신고촬영) */}
        {/* (A안) 단수: /worker/issue, /worker/issue/report */}
        <Route path="issue" element={<IssueListPage />} />
        <Route path="issue/report" element={<IssueReportPage />} />
        <Route path="issue/result" element={<IssueResultPage />} />

        {/* (B안) 복수 유지하고 싶으면 위 2줄 대신 아래 2줄 사용
            <Route path="issues" element={<IssueListPage />} />
            <Route path="issues/report" element={<IssueReportPage />} />
        */}

        {/* 사이드바 연결 페이지들 */}
        <Route path="mypage" element={<MyPage />} />
        <Route path="profile/edit" element={<ProfileEdit />} />
        <Route path="work-history" element={<WorkHistory />} />

        {/* ✅ 기존 /worker/issues를 이미 쓰고 있으면 호환 리다이렉트 */}
        <Route path="issues" element={<Navigate to="/worker/issue" replace />} />
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
