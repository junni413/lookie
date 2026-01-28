import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background">
          <AdminSidebar />
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Sidebar 고정 + 본문만 스크롤 */}
          <main className="h-screen overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
