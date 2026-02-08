import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { X, Home, User, History, FileText, LogOut, ChevronRight } from "lucide-react";

export default function WorkerDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWorkerDrawerOpen, closeWorkerDrawer } = useUIStore();
  const { user, logout } = useAuthStore();

  const MENUS = useMemo(
    () => [
      {
        title: "홈",
        desc: "작업 대시보드",
        to: "/worker/home",
        icon: Home,
      },
      {
        title: "마이페이지",
        desc: "내 정보 조회 및 수정",
        to: "/worker/mypage",
        icon: User,
      },
      {
        title: "근무 이력 조회",
        desc: "월별 출퇴근 기록 확인",
        to: "/worker/work-history",
        icon: History,
      },
      {
        title: "이슈 목록 조회",
        desc: "정상 및 특이사항 내역",
        to: "/worker/issue",
        icon: FileText,
      },
    ],
    []
  );

  // ESC key to close
  useEffect(() => {
    if (!isWorkerDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWorkerDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWorkerDrawerOpen, closeWorkerDrawer]);

  if (!isWorkerDrawerOpen) return null;

  const handleNavigate = (to: string) => {
    closeWorkerDrawer();
    navigate(to);
  };

  const handleLogout = () => {
    closeWorkerDrawer();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[1001] flex justify-end">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-sm"
        onClick={closeWorkerDrawer}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="
          relative h-full w-[320px] max-w-[88vw] bg-white
          shadow-[0_12px_40px_rgba(2,6,23,0.16)]
          rounded-l-[28px] flex flex-col overflow-hidden
          animate-in slide-in-from-right duration-300
        "
        role="dialog"
        aria-modal="true"
        aria-label="worker drawer"
      >
        {/* Header */}
        <div className="pt-9 px-7 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">

              <div className="flex flex-col">
                <span className="text-[22px] font-black text-slate-900 leading-none">
                  {user?.name || "작업자"}님
                </span>
                <span className="mt-1 text-[13px] font-bold text-slate-500">
                  오늘도 안전하게 작업하세요!
                </span>
              </div>
            </div>

            <button
              onClick={closeWorkerDrawer}
              className="
                h-10 w-10 rounded-full grid place-items-center
                text-slate-500 hover:bg-slate-100 active:scale-[0.98] transition
              "
              aria-label="close"
              type="button"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Section title */}
        <div className="px-7 pb-2">
          <p className="text-[12px] font-black text-slate-400 tracking-wide"> </p>
        </div>

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-1">
            {MENUS.map((menu) => {
              const isActive = location.pathname === menu.to;
              const Icon = menu.icon;

              return (
                <button
                  key={menu.to}
                  onClick={() => handleNavigate(menu.to)}
                  className={[
                    "w-full relative flex items-center gap-4 rounded-[16px] px-4 py-4",
                    "transition active:scale-[0.99]",
                    isActive ? "bg-blue-50/70" : "hover:bg-slate-50",
                  ].join(" ")}
                  type="button"
                >
                  {/* Left indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-600" />
                  )}

                  {/* Icon chip */}
                  <div
                    className={[
                      "h-11 w-11 rounded-[14px] grid place-items-center",
                      isActive ? "bg-white" : "bg-slate-100",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    <Icon
                      size={22}
                      strokeWidth={2}
                      className={isActive ? "text-blue-600" : "text-slate-600"}
                    />
                  </div>

                  <div className="flex-1 text-left">
                    <p
                      className={[
                        "text-[16px] font-black",
                        isActive ? "text-slate-900" : "text-slate-800",
                      ].join(" ")}
                    >
                      {menu.title}
                    </p>

                    {/* Desc: show only when active (toss-like density) */}
                    {isActive && (
                      <p className="mt-1 text-[12px] font-bold text-slate-500">{menu.desc}</p>
                    )}
                  </div>

                  <ChevronRight
                    size={18}
                    strokeWidth={2.5}
                    className={isActive ? "text-slate-400" : "text-slate-300"}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="
              w-full h-12 flex items-center justify-center gap-2
              rounded-[14px] text-slate-600 font-black
              hover:bg-slate-50 active:scale-[0.99] transition
            "
            type="button"
          >
            <LogOut size={18} strokeWidth={2.2} />
            로그아웃
          </button>

          <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
            LOOKie • Smart Logistics
          </p>
        </div>
      </aside>
    </div>
  );
}
