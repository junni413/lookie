import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { ADMIN_MENU } from "@/config/adminMenu";

export default function AdminLayout() {
  const location = useLocation();
  // Find active menu item
  const activeItem = ADMIN_MENU.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = activeItem ? activeItem.label : "Dashboard"; // Default to Dashboard
  const pageDescription = activeItem?.description || "관리자 대시보드입니다.";

  // 🔒 LOCKED LAYOUT: This structure (h-screen, overflow-hidden) is fixed.
  // DO NOT remove 'h-screen' or 'overflow-hidden'. The user requires the app to strictly fit the viewport.
  return (
    // Outer Background matches Sidebar (Dark) to create the curve effect through negative space
    <div className="h-screen bg-slate-900 overflow-hidden font-pretendard">
      <div className="flex h-full">
        {/* Sidebar: Dark Background */}
        <aside className="hidden md:flex w-64 flex-col bg-slate-900 h-full z-10 text-white">
          <AdminSidebar />
        </aside>

        {/* Content Wrapper: The "Card" overlay */}
        <div className="flex-1 min-w-0 flex flex-col h-full relative z-0 bg-[#f8f9fc] rounded-l-[40px] overflow-hidden my-2 mr-2 shadow-2xl">

          {/* Page Header */}
          <div className="shrink-0 px-8 pt-8 pb-6 flex items-center justify-between bg-[#f8f9fc]">
            <div>
              <h1 className="text-3xl font-light text-slate-800 tracking-tight">{pageTitle}</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">{pageDescription}</p>
            </div>

            {/* Right Side Tools */}
            <div className="flex items-center gap-4">
              {/* Placeholders */}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-0 bg-[#f8f9fc]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
