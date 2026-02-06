import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import WorkerDrawer from "@/components/layout/WorkerDrawer";
import { useUIStore } from "@/stores/uiStore";
import { useCallStore } from "@/stores/callStore"; // Import callStore
import { Bell, LayoutGrid, ChevronLeft } from "lucide-react";

export type MobileLayoutContext = { setTitle: (t: string) => void };

export default function MobileLayout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Lookie");
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

  return (
    <div className="min-h-dvh bg-gray-50 flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh bg-white shadow-sm flex flex-col relative">

        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          {/* left */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="h-5 w-5 text-gray-900" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>

          {/* right icons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="relative rounded-lg p-2 hover:bg-gray-100"
              aria-label="알림"
              onClick={() => alert("TODO: 알림 페이지/모달")}
            >
              <Bell className="h-6 w-6 text-gray-900" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
            </button>

            <button
              type="button"
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="사이드바 열기"
              onClick={toggleWorkerDrawer}
            >
              <LayoutGrid className="h-6 w-6 text-gray-900" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4">
          <Outlet context={{ setTitle }} />
        </main>

        <WorkerDrawer />
      </div>
    </div>
  );
}
