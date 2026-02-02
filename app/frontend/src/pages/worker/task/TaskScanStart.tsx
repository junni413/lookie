import { useLocation, useNavigate } from "react-router-dom";
import type { TaskVO } from "@/types/task";
import { MapPin, Layers, Package, Bell, LayoutGrid, ChevronRight } from "lucide-react";

export default function TaskScanStart() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const task = (state as { task?: TaskVO })?.task;

  if (!task) {
    navigate("/worker/home", { replace: true });
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-12 pb-6 px-4">

      {/* 배정된 작업 카드 */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">배정된 작업</p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {/* 구역 */}
          <div className="rounded-[24px] bg-gray-50/50 p-4 text-center">
            <MapPin className="mx-auto w-5 h-5 text-gray-400 mb-2" />
            <p className="text-[12px] font-medium text-gray-400">구역</p>
            <p className="mt-1 text-xl font-extrabold text-gray-900">
              {task.displayZone || `Z-${task.zoneId}`}
            </p>
          </div>
          {/* 라인 */}
          <div className="rounded-[24px] bg-gray-50/50 p-4 text-center">
            <Layers className="mx-auto w-5 h-5 text-gray-400 mb-2" />
            <p className="text-[12px] font-medium text-gray-400">라인</p>
            <p className="mt-1 text-xl font-extrabold text-gray-900">
              {task.displayLine || "L-01"}
            </p>
          </div>
          {/* 물품 수 */}
          <div className="rounded-[24px] bg-gray-50/50 p-4 text-center">
            <Package className="mx-auto w-5 h-5 text-gray-400 mb-2" />
            <p className="text-[12px] font-medium text-gray-400">물품 수</p>
            <p className="mt-1 text-xl font-extrabold text-gray-900">
              {task.itemCount || 0}
            </p>
          </div>
        </div>
      </section>

      {/* 하단 안내 + 버튼 */}
      <div className="text-center pt-8">
        <p className="text-2xl font-black text-gray-900 tracking-tight">
          토트를 챙기고 스캔하세요.
        </p>

        <button
          type="button"
          onClick={() => {
            navigate("/worker/task/tote-scan", { state: { task } });
          }}
          className="mx-auto mt-8 w-full max-w-[280px] rounded-[40px] bg-blue-600 px-6 py-10 text-white shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all relative group"
        >
          <div className="text-2xl font-black mb-4">스캔하기</div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </button>

        <p className="mx-auto mt-10 max-w-[250px] text-[15px] font-medium text-gray-400 leading-relaxed break-keep">
          선택한 토트의 바코드를 스캔해야 작업을 시작할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
