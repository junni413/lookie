import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import {
  X,
  Home,
  User,
  History,
  FileText,
  LogOut,
  ChevronRight
} from "lucide-react";

export default function WorkerDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWorkerDrawerOpen, closeWorkerDrawer } = useUIStore();
  const { user, logout } = useAuthStore();

  const MENUS = useMemo(() => [
    {
      title: "홈",
      desc: "작업 대시보드 및 요약",
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
  ], []);

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
      {/* Dimmed Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={closeWorkerDrawer}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`relative h-full w-[320px] max-w-[85vw] bg-white shadow-2xl rounded-l-[40px] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`}
      >
        {/* Header Section */}
        <div className="pt-10 px-8 pb-8 flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[28px] font-black text-slate-900 tracking-tight leading-none">
              {user?.name || "작업자"}님
            </span>
            <span className="text-[16px] font-bold text-slate-400">
              오늘도 안전하게 화이팅!
            </span>
          </div>
          <button
            onClick={closeWorkerDrawer}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <X size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Menu List */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-3">
            {MENUS.map((menu) => {
              const isActive = location.pathname === menu.to;
              const Icon = menu.icon;

              return (
                <button
                  key={menu.to}
                  onClick={() => handleNavigate(menu.to)}
                  className={`w-full group px-5 py-5 rounded-[24px] flex items-center transition-all duration-300 ${isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-200/50 scale-[1.02]"
                    : "text-slate-600 hover:bg-slate-50 active:scale-[0.98]"
                    }`}
                >
                  <div className={`p-3 rounded-2xl flex items-center justify-center transition-colors ${isActive ? "bg-white/20" : "bg-slate-50 group-hover:bg-white"
                    }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>

                  <div className="flex-1 ml-5 text-left">
                    <p className={`text-[18px] font-black ${isActive ? "text-white" : "text-slate-800"}`}>
                      {menu.title}
                    </p>
                    <p className={`text-[13px] mt-1 font-bold ${isActive ? "text-white/70" : "text-slate-400"}`}>
                      {menu.desc}
                    </p>
                  </div>

                  <ChevronRight
                    size={20}
                    className={`transition-transform duration-300 ${isActive ? "text-white opacity-70" : "text-slate-300 group-hover:translate-x-1"
                      }`}
                    strokeWidth={3}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/30">
          <button
            onClick={handleLogout}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-[20px] text-slate-500 font-black text-base tracking-tight hover:text-red-500 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={22} strokeWidth={2.5} />
            로그아웃
          </button>
        </div>
      </aside>
    </div>
  );
}
