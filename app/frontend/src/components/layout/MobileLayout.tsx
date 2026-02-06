import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import WorkerDrawer from "@/components/layout/WorkerDrawer";
import { useUIStore } from "@/stores/uiStore";
import { useCallStore } from "@/stores/callStore"; // Import callStore
import { Bell, LayoutGrid, ChevronLeft } from "lucide-react";

export type MobileLayoutContext = { 
  setTitle: (t: string) => void;
  setHeaderRight: (el: React.ReactNode) => void;
  setHeaderCenter: (el: React.ReactNode) => void;
};

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleWorkerDrawer = useUIStore((s) => s.toggleWorkerDrawer);
  const listenForIncomingCalls = useCallStore((s) => s.listenForIncomingCalls);

  useEffect(() => {
    listenForIncomingCalls();
  }, [listenForIncomingCalls]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/worker/home", { replace: true });
  };

  const [headerRight, setHeaderRight] = useState<React.ReactNode>(null);
  const [headerCenter, setHeaderCenter] = useState<React.ReactNode>(null);
  
  // 타이틀 표시를 안 하기로 했으므로 setTitle은 더이상 상태를 변경하지 않는 no-op으로 제공
  const setTitle = () => {};

  const contextValue = useMemo(() => ({ setTitle, setHeaderRight, setHeaderCenter }), []);

  // 홈화면이나 출근화면에서는 뒤로가기 숨김
  const hideBackButton = location.pathname === "/worker/home" || location.pathname === "/worker/attend";

  return (
    <div className="min-h-dvh bg-gray-50 flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh bg-white shadow-sm flex flex-col relative">
        <header className="sticky top-0 z-[50] flex items-center justify-between bg-white/70 backdrop-blur-xl px-5 pt-7 pb-4 border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
          {/* left */}
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleBack}
                className="h-10 w-10 flex items-center justify-center rounded-[14px] bg-white border border-slate-100 shadow-sm transition-all text-slate-600 hover:text-slate-900"
                aria-label="뒤로가기"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </motion.button>
            )}
          </div>

          {/* center slot */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
            {headerCenter}
          </div>

          {/* right icons */}
          <div className="flex items-center gap-3">
            {headerRight}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-[14px] bg-white border border-slate-100 shadow-sm transition-all text-slate-600 hover:text-slate-900"
              aria-label="사이드바 열기"
              onClick={toggleWorkerDrawer}
            >
              <LayoutGrid size={20} strokeWidth={2.5} />
            </motion.button>
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
