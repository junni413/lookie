import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MobileLayout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Lookie");

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/worker/home", { replace: true });
  };

  return (
    // ✅ 바깥도 flex로 (가운데 정렬/스크롤 안정)
    <div className="min-h-dvh bg-gray-50 flex justify-center">
      {/* ✅ 기기 프레임(430px)도 세로 flex + 화면 높이 */}
      <div className="w-full max-w-[430px] min-h-dvh bg-white shadow-sm flex flex-col">
        {/* 헤더: 고정 */}
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
            aria-label="뒤로가기"
          >
            ←
          </button>
          <h1 className="text-base font-semibold">{title}</h1>
        </header>

        {/* ✅ 핵심: main이 남은 높이 전부 먹어야 Attend가 화면 가운데로 감 */}
        <main className="flex-1 min-h-0 p-4">
          <Outlet context={{ setTitle }} />
        </main>
      </div>
    </div>
  );
}
