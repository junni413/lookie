import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

type MenuItem = {
  title: string;
  desc: string;
  to: string;
  emoji: string;
};

const MENUS: MenuItem[] = [
  {
    title: "마이페이지",
    desc: "내 정보 조회 및 수정",
    to: "/worker/mypage", // ✅ 사이드바는 '마이페이지'로 이동
    emoji: "👤",
  },
  {
    title: "근무 이력 조회",
    desc: "월별 근무 시간 확인",
    to: "/worker/work-history",
    emoji: "📅",
  },
  {
    title: "이슈 목록 조회",
    desc: "처리된 이슈 내역",
    to: "/worker/issues",
    emoji: "🧾",
  },
];

export default function WorkerDrawer() {
  const navigate = useNavigate();
  const { isWorkerDrawerOpen, closeWorkerDrawer } = useUIStore();
  const logout = useAuthStore((s) => s.logout);

  // ESC로 닫기
  useEffect(() => {
    if (!isWorkerDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWorkerDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWorkerDrawerOpen, closeWorkerDrawer]);

  if (!isWorkerDrawerOpen) return null;

  const go = (to: string) => {
    closeWorkerDrawer();
    navigate(to);
  };

  const handleLogout = () => {
    closeWorkerDrawer();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={closeWorkerDrawer}
        aria-hidden="true"
      />

      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] bg-white shadow-xl rounded-l-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">메뉴</div>
          <button
            type="button"
            onClick={closeWorkerDrawer}
            className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {MENUS.map((m) => (
            <button
              key={m.to}
              type="button"
              onClick={() => go(m.to)}
              className="w-full rounded-2xl border bg-white p-4 text-left hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-lg">{m.emoji}</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{m.title}</div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </div>
                <div className="text-gray-400">{">"}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl py-3 text-gray-700 hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <span>↩</span>
            <span className="font-semibold">로그아웃</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
