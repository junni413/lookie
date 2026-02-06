import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useCallStore } from "@/stores/callStore";
import VideoCallModal from "@/components/webrtc/VideoCallModal";

export default function AdminLayout() {
  const listenForIncomingCalls = useCallStore((state) => state.listenForIncomingCalls);

  useEffect(() => {
    listenForIncomingCalls();
  }, [listenForIncomingCalls]);

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
        <div className="flex-1 min-w-0 flex flex-col h-full relative z-0 bg-[#f8f9fc] overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-0 bg-[#f8f9fc]">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Call Modal */}
      <VideoCallModal />
    </div>
  );
}
