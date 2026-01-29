import { useLocation, useNavigate } from "react-router-dom";

type AssignedTask = { zone: string; line: string; count: number };

export default function TaskScanStart() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // TaskAssignLoading에서 넘겨준 task 받기 (없으면 임시값)
  const task =
    (state as { task?: AssignedTask })?.task ?? {
      zone: "A-2",
      line: "L-05",
      count: 24,
    };

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-8 pb-6">
      {/* 배정된 작업 카드 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
            <span className="text-sm">📦</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">배정된 작업</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gray-50 p-3 text-center">
            <p className="text-[11px] font-medium text-gray-500">구역</p>
            <p className="mt-2 text-lg font-extrabold text-gray-900">
              {task.zone}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 text-center">
            <p className="text-[11px] font-medium text-gray-500">라인</p>
            <p className="mt-2 text-lg font-extrabold text-gray-900">
              {task.line}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 text-center">
            <p className="text-[11px] font-medium text-gray-500">물품 수</p>
            <p className="mt-2 text-lg font-extrabold text-gray-900">
              {task.count}
            </p>
          </div>
        </div>
      </section>

      {/* 중앙 안내 + 버튼 */}
      <div className="text-center">
        <p className="text-base font-extrabold text-gray-900">
          토트를 챙기고 스캔하세요.
        </p>

        <button
          type="button"
          onClick={() => {
            navigate("/worker/task/tote-scan", { state: { task } });
          }}
          className="mx-auto mt-5 w-full max-w-[280px] rounded-3xl bg-blue-600 px-6 py-6 text-white shadow-lg active:scale-[0.99]"
        >
          <div className="text-sm font-semibold">스캔하기</div>
          <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg leading-none">›</span>
          </div>
        </button>

        <p className="mx-auto mt-4 max-w-[320px] text-xs text-gray-500">
          선택한 토트의 바코드를 스캔해야 작업을 시작할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
