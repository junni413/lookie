import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import WorkerDrawer from "@/components/layout/WorkerDrawer";
import { useUIStore } from "@/stores/uiStore";
import { useCallStore } from "@/stores/callStore"; // Import callStore
import VideoCallModal from "@/components/webrtc/VideoCallModal"; // Import VideoCallModal
import { LayoutGrid, ChevronLeft } from "lucide-react";

export type MobileLayoutContext = { setTitle: (t: string) => void };

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleWorkerDrawer = useUIStore((s) => s.toggleWorkerDrawer);
  const listenForIncomingCalls = useCallStore((s) => s.listenForIncomingCalls); // Get listener action

  // Start listening for incoming calls when layout mounts
  useEffect(() => {
    listenForIncomingCalls();
  }, [listenForIncomingCalls]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/worker/home", { replace: true });
  };

  // 타이틀 표시를 안 하기로 했으므로 setTitle은 더이상 상태를 변경하지 않는 no-op으로 제공
  const setTitle = () => {};
  const contextValue = useMemo(() => ({ setTitle }), []);

  // 홈화면이나 출근화면에서는 뒤로가기 숨김
  const hideBackButton = location.pathname === "/worker/home" || location.pathname === "/worker/attend";

  return (
    <div className="min-h-dvh bg-gray-50 flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh bg-white shadow-sm flex flex-col relative">
        {/* Video Call Modal */}
        <VideoCallModal />

        <header className="sticky top-0 z-10 flex items-center justify-between bg-white/70 backdrop-blur-xl px-5 pt-7 pb-4 border-b border-gray-100/50">
          {/* left */}
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="h-11 w-11 flex items-center justify-center rounded-[18px] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.06)] active:scale-95 transition-all text-slate-800 border border-gray-50/50"
                aria-label="뒤로가기"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* right icons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-11 w-11 flex items-center justify-center rounded-[18px] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.06)] active:scale-95 transition-all text-slate-800 border border-gray-50/50"
              aria-label="사이드바 열기"
              onClick={toggleWorkerDrawer}
            >
              <LayoutGrid size={22} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4">
          <Outlet context={contextValue} />
        </main>

        <WorkerDrawer />
      </div>
    </div>
  );
}
