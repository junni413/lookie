import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useCallStore } from "@/stores/callStore";

import { useAuthStore } from "@/stores/authStore";

export default function AdminLayout() {
  const listenForIncomingCalls = useCallStore((state) => state.listenForIncomingCalls);
  
  // Auth state
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (token && user) {
      listenForIncomingCalls();
    }
  }, [listenForIncomingCalls, token, user]);

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
        <div className="flex-1 min-w-0 flex flex-col h-full relative z-0 bg-slate-50 overflow-hidden md:rounded-l-[40px] shadow-2xl">
          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-0 bg-slate-50">
            <Outlet />
          </main>
        </div>
      </div>
      
    </div>
  );
}
