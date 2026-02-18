import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import type { UserRole } from "@/types/db";

const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));
const MobileLayout = lazy(() => import("./components/layout/MobileLayout"));

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));

const PasswordForgot = lazy(() => import("./pages/auth/password/PasswordForgot"));
const PasswordCode = lazy(() => import("./pages/auth/password/PasswordCode"));
const PasswordReset = lazy(() => import("./pages/auth/password/PasswordReset"));

const WorkerAttend = lazy(() => import("./pages/worker/Attend"));
const WorkerHome = lazy(() => import("./pages/worker/Home"));
const MyPage = lazy(() => import("./pages/worker/MyPage"));
const ProfileEdit = lazy(() => import("./pages/worker/ProfileEdit"));
const WorkHistory = lazy(() => import("./pages/worker/WorkHistory"));
const IssueListPage = lazy(() => import("./pages/worker/issue/IssueList"));
const IssueReportPage = lazy(() => import("./pages/worker/issue/IssueReport"));
const IssueResultPage = lazy(() => import("./pages/worker/issue/IssueResult"));
const IssueDetail = lazy(() => import("./pages/worker/issue/IssueDetail"));
const AiStockAnalysis = lazy(() => import("./pages/worker/issue/AiStockAnalysis"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const IssuePage = lazy(() => import("./pages/admin/Issue"));
const ManagePage = lazy(() => import("./pages/admin/Manage"));
const MapPage = lazy(() => import("./pages/admin/Map"));
const ContactPage = lazy(() => import("./pages/admin/Contact"));

const TaskAssignLoading = lazy(() => import("./pages/worker/task/TaskAssignLoading"));
const TaskScanStart = lazy(() => import("./pages/worker/task/TaskScanStart"));
const ToteScan = lazy(() => import("./pages/worker/task/ToteScan"));
const WorkDetail = lazy(() => import("./pages/worker/task/WorkDetail"));
const TaskList = lazy(() => import("./pages/worker/task/TaskList"));

import VideoCallModal from "./components/webrtc/VideoCallModal";
import { ToastContainer } from "./components/ui/toast";

const Promo = lazy(() => import("./pages/auth/Promo"));

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

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
    <>
      <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/auth/promo" element={<Promo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/auth/password/forgot" element={<PasswordForgot />} />
          <Route path="/auth/password/code" element={<PasswordCode />} />
          <Route path="/auth/password/reset" element={<PasswordReset />} />

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
            <Route index element={<Navigate to="/worker/attend" replace />} />
            <Route path="attend" element={<WorkerAttend />} />
            <Route path="home" element={<WorkerHome />} />
            <Route path="task/loading" element={<TaskAssignLoading />} />
            <Route path="task/scan-start" element={<TaskScanStart />} />
            <Route path="task/tote-scan" element={<ToteScan />} />
            <Route path="task/work-detail" element={<WorkDetail />} />
            <Route path="task/list" element={<TaskList />} />
            <Route path="issue" element={<IssueListPage />} />
            <Route path="issue/report" element={<IssueReportPage />} />
            <Route path="issue/result" element={<IssueResultPage />} />
            <Route path="issue/detail" element={<IssueDetail />} />
            <Route path="issue/stock-analysis" element={<AiStockAnalysis />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="profile/edit" element={<ProfileEdit />} />
            <Route path="work-history" element={<WorkHistory />} />
            <Route path="issues" element={<Navigate to="/worker/issue" replace />} />
          </Route>

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
            <Route path="manage" element={<ManagePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="issue" element={<IssuePage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <VideoCallModal />
      <ToastContainer />
    </>
  );
}
