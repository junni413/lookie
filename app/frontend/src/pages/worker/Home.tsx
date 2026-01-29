import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";

type WorkStatus = "WORKING" | "PAUSED";

export default function Home() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();

  const [workStatus, setWorkStatus] = useState<WorkStatus>("WORKING");

  useEffect(() => {
    setTitle("홈");
  }, [setTitle]);

  // 임시 데이터 (나중에 API로 교체)
  const workStats = [
    { id: "done", label: "처리한 작업", value: 53, icon: "📦" },
    { id: "issue", label: "전체 이슈", value: 10, icon: "🧾" },
    { id: "waiting", label: "처리 대기 중", value: 2, icon: "⏳" },
  ];

  const onStartNewTask = () => {
    navigate("/worker/task/loading");
  };

  const onPause = () => setWorkStatus("PAUSED");
  const onResume = () => setWorkStatus("WORKING");
  const onCheckout = () => {
    // TODO: 퇴근 처리 (나중에 API 연동)
    alert("퇴근 처리(임시)");
  };

  return (
    <div className="space-y-4">
      {/* 출근 카드 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-lg">
              ⏱️
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                오늘의 출근 시간
              </p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
                — —
              </p>
            </div>
          </div>

          <span
            className={
              workStatus === "WORKING"
                ? "rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                : "rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700"
            }
          >
            {workStatus === "WORKING" ? "근무중" : "근무중단"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {workStatus === "WORKING" ? (
            <>
              <button
                type="button"
                className="h-11 rounded-xl border bg-white text-sm font-semibold text-gray-700 active:scale-[0.99]"
                onClick={onPause}
              >
                중단
              </button>

              <button
                type="button"
                className="h-11 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 active:scale-[0.99]"
                onClick={onCheckout}
              >
                퇴근
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm active:scale-[0.99]"
                onClick={onResume}
              >
                재개
              </button>

              <button
                type="button"
                className="h-11 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 active:scale-[0.99]"
                onClick={onCheckout}
              >
                퇴근
              </button>
            </>
          )}
        </div>
      </section>

      {/* 오늘의 작업 카드 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">오늘의 작업</h2>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {workStats.map((s) => (
            <div key={s.id} className="rounded-2xl bg-gray-50 p-3 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base">
                {s.icon}
              </div>

              <p className="mt-3 text-2xl font-extrabold leading-none text-gray-900">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-medium text-gray-600">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 하단: 새로운 작업 시작 (리스트 버튼) */}
      <button
        type="button"
        onClick={onStartNewTask}
        className="flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left shadow-sm active:scale-[0.99]"
        disabled={workStatus === "PAUSED"}
      >
        <span
          className={
            workStatus === "PAUSED"
              ? "text-sm font-semibold text-gray-400"
              : "text-sm font-semibold text-gray-900"
          }
        >
          새로운 작업 시작
        </span>
        <span className="text-lg text-gray-400">›</span>
      </button>

      {workStatus === "PAUSED" && (
        <p className="px-1 text-xs text-gray-500">
          근무가 중단된 상태에서는 새로운 작업을 시작할 수 없어요.
        </p>
      )}
    </div>
  );
}
