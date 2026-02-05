import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TaskVO } from "@/types/task";
import { MapPin, ScanLine, X, CheckCircle2, AlertTriangle } from "lucide-react";

function zoneText(task: any) {
  const z = task?.assignedZoneId ?? task?.zoneId;
  const map: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };
  const letter = z != null ? map[z] : null;
  return task?.displayZone || (letter ? `Zone ${letter}` : z ? `Zone ${z}` : "Zone ?");
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
    <div className="mx-auto w-full max-w-[430px] space-y-4 pb-10 px-4">
      {/* 상단 요약 */}
      <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[17px] font-black text-slate-900">배정 구역</p>
            </div>
          </div>

          <span className="rounded-full bg-blue-50/80 px-4 py-2 text-[11px] font-black text-blue-700">
            토트 스캔 필요
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between pl-4">
          <div className="text-[24px] font-black text-blue-600 tracking-tight">{zoneText(task)}</div>
          <p className="text-[12px] font-semibold text-slate-400">
            지정된 구역을 확인하세요.
          </p>
        </div>
      </section>

      {/* ✅ 토트 스캔 가이드 (접힘/펼침) */}
      <section
        className={`
          rounded-[24px] border border-slate-100 bg-white shadow-sm overflow-hidden
          transition-all duration-300
          ${openGuide ? "p-5" : "p-4"}
        `}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
              <ScanLine className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[17px] font-black text-slate-900">토트 스캔 가이드</p>
            </div>
          </div>

          {/* 우측 버튼: 상세보기 or X */}
          {!openGuide ? (
            <button
              type="button"
              onClick={() => setOpenGuide(true)}
              className="rounded-full bg-blue-50/80 px-4 py-2 text-[11px] font-black text-blue-700 active:scale-[0.98] transition whitespace-nowrap"
            >
              상세보기
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpenGuide(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-[0.98] transition"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-1 pl-14">
           <p className="text-[12px] font-bold text-slate-400">
            {openGuide ? "아래 순서대로 따라하세요." : "상세보기를 눌러 확인하세요."}
          </p>
        </div>

        {/* ✅ 펼쳐지는 영역 */}
        <div
          className={`
            grid transition-[grid-template-rows,opacity] duration-300 ease-out
            ${openGuide ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"}
          `}
        >
          <div className="overflow-hidden">
            {/* 단계 설명 */}
            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-blue-700">
                  1
                </div>
                <div>
                  <p className="text-[14px] font-black text-slate-900">토트를 준비해요</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-400 leading-snug">
                    바코드 스티커가 깨끗한지 확인해주세요.
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-blue-700">
                  2
                </div>
                <div>
                  <p className="text-[14px] font-black text-slate-900">중앙에 맞춰요</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-400 leading-snug">
                    바코드가 화면 중앙에 오도록 살짝 거리를 두세요.
                  </p>
                </div>
              </li>
            </ol>

            {/* 주의/팁 */}
            <div className="mt-6">
              <div className="rounded-2xl bg-emerald-50/50 p-4 flex gap-3 border border-emerald-100/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                <p className="text-[12px] font-bold text-emerald-800 leading-relaxed">
                  스캔이 완료되어야 다음 단계로 진행할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 버튼 section */}
      <div className="flex flex-col items-center pt-10">
        <div className="relative">
          {/* Pulsating Ring (Attend.tsx 스타일) */}
          <div className="absolute inset-0 bg-blue-600/20 rounded-[44px] animate-pulse scale-110 blur-xl" />

          <button
            type="button"
            onClick={() => navigate("/worker/task/tote-scan", { state: { task } })}
            className="
              relative z-10
              w-[240px] h-[240px]
              rounded-[48px]
              bg-gradient-to-br from-blue-600 to-indigo-700
              text-white
              flex flex-col items-center justify-center gap-4
              shadow-[0_25px_50px_rgba(37,99,235,0.4)]
              active:scale-[0.96] transition-all duration-300
            "
          >
            <span className="text-[24px] font-black tracking-tight leading-none mb-1">
              토트 스캔하기
            </span>
          </button>
        </div>

        <p className="mt-10 max-w-[280px] text-center text-[15px] font-bold text-slate-400 leading-relaxed px-4 opacity-70 break-keep">
          카메라 권한이 필요합니다. 설정에서 권한을 확인해주세요.
        </p>
      </div>
    </div>
  );
}
