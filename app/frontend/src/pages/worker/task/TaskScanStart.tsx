import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TaskVO } from "@/types/task";
import { MapPin, ChevronRight, ScanLine, X, CheckCircle2, AlertTriangle } from "lucide-react";

function zoneText(task: any) {
  const z = task?.assignedZoneId ?? task?.zoneId;
  return task?.displayZone || (z ? `Z-${z}` : "Z-?");
}

export default function TaskScanStart() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { task } = (state as { task?: TaskVO }) || {};

  const [openGuide, setOpenGuide] = useState(false);

  useEffect(() => {
    if (!task) navigate("/worker/home", { replace: true });
  }, [task, navigate]);

  if (!task) return null;

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-10 pb-6 px-4">
      {/* 상단 요약 */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-gray-400">배정 구역</p>
              <p className="text-lg font-extrabold text-gray-900">{zoneText(task)}</p>
            </div>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            토트 스캔 필요
          </span>
        </div>
      </section>

      {/* ✅ 토트 스캔 가이드 (접힘/펼침) */}
      <section
        className={`
          rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden
          transition-all duration-300
          ${openGuide ? "p-6" : "p-5"}
        `}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50">
              <ScanLine className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900">토트 스캔 가이드</p>
              <p className="text-[13px] font-semibold text-gray-400">
                {openGuide ? "아래 순서대로 따라하세요." : "설명 상세보기를 눌러 확인하세요."}
              </p>
            </div>
          </div>

          {/* 우측 버튼: 상세보기 or X */}
          {!openGuide ? (
            <button
              type="button"
              onClick={() => setOpenGuide(true)}
              className="rounded-full bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-700 active:scale-[0.98] transition"
            >
              설명 상세보기
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpenGuide(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-700 active:scale-[0.98] transition"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ✅ 펼쳐지는 영역 */}
        <div
          className={`
            grid transition-[grid-template-rows,opacity] duration-300 ease-out
            ${openGuide ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0"}
          `}
        >
          <div className="overflow-hidden">
            {/* 단계 설명 */}
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[12px] font-black text-blue-700">
                  1
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-900">토트를 준비해요</p>
                  <p className="mt-1 text-[13px] font-medium text-gray-500">
                    토트 바코드 스티커가 구겨지지 않게 펴고, 오염(물/먼지)이 있으면 닦아주세요.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[12px] font-black text-blue-700">
                  2
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-900">카메라를 중앙에 맞춰요</p>
                  <p className="mt-1 text-[13px] font-medium text-gray-500">
                    바코드가 화면 중앙에 오게 하고, 너무 가까우면 초점이 안 잡혀요. 살짝 거리를 둬주세요.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[12px] font-black text-blue-700">
                  3
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-900">인식되면 자동으로 넘어가요</p>
                  <p className="mt-1 text-[13px] font-medium text-gray-500">
                    인식이 반복 실패하면 조명을 밝게 하거나, 각도를 살짝 바꿔 다시 시도하세요.
                  </p>
                </div>
              </li>
            </ol>

            {/* 주의/팁 */}
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-emerald-50 p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" />
                <p className="text-[13px] font-semibold text-emerald-800 leading-relaxed">
                  토트 스캔이 완료되어야 다음 단계(지번 스캔/피킹)를 진행할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 버튼 */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate("/worker/task/tote-scan", { state: { task } })}
          className="mx-auto w-full max-w-[280px] rounded-[40px] bg-blue-600 px-6 py-10 text-white shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all relative group"
        >
          <div className="text-2xl font-black mb-4">스캔 시작</div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </button>

        <p className="mx-auto mt-6 max-w-[280px] text-[13px] font-medium text-gray-400 leading-relaxed break-keep">
          카메라 권한이 필요합니다. 권한이 거부되어 있으면 설정에서 카메라를 허용해주세요.
        </p>
      </div>
    </div>
  );
}
