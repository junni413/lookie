import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MobileLayout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Lookie");

  const handleBack = () => {
    // 히스토리 스택이 있으면 뒤로, 없으면 워커 홈으로
    if (window.history.length > 1) navigate(-1);
    else navigate("/worker/home", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-sm">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            ←
          </button>
          <h1 className="text-base font-semibold">{title}</h1>
        </header>

        <main className="p-4">
          <Outlet context={{ setTitle }} />
        </main>
      </div>
    </div>
  );
}
