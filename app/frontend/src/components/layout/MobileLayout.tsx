import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

export type MobileLayoutContext = {
  setTitle: (title: string) => void;
};

export default function MobileLayout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Lookie");

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] bg-white shadow-sm flex flex-col">
        {/* Header */}
        <header className="shrink-0 sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            ←
          </button>
          <h1 className="text-base font-semibold">{title}</h1>
        </header>

        {/* Main: 여기만 스크롤 */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet context={{ setTitle }} />
        </main>

        {/* (선택) BottomNav 자리 */}
        {/* <nav className="shrink-0 border-t bg-white p-3">하단바</nav> */}
      </div>
    </div>
  );
}
