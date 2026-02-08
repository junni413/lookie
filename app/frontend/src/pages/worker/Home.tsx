import { ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";
import { taskService } from "../../services/taskService";
import { workLogApi } from "@/services/attend.api";
import type { ApiResponse, WorkLogData, WorkLogStatus } from "@/services/attend.api";

type WorkStatus = "WORKING" | "PAUSED";
type Stats = { done: number; issue: number; waiting: number };

function formatHHmm(isoLike: string) {
  const timePart = isoLike.split("T")[1] ?? "";
  const hhmmss = timePart.slice(0, 8); // "14:59:46"
  return hhmmss.length === 8 ? hhmmss : "—:—:—";
}

// ✅ 구역 표기 통일: assignedZoneId(1~4) => "Zone A"~"Zone D"
function zoneLabelFromAssignedId(assignedZoneId: number | null | undefined) {
  if (assignedZoneId == null) return "Zone ?";

  const map: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };
  const letter = map[assignedZoneId];
  return `Zone ${letter ?? assignedZoneId}`;
}

function mapBackendStatusToUi(status: WorkLogStatus): WorkStatus {
  if (status === "PAUSE") return "PAUSED";
  return "WORKING"; // START/RESUME
}

// ✅ 예전 디자인 ZoneCard 유지
function ZoneCard({ zone }: { zone: string }) {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-black text-slate-900">근무 구역</p>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
          배정 완료
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[24px] font-black text-[#304FFF] tracking-tight">{zone}</div>
        <p className="text-[12px] font-semibold text-slate-400">
          지정된 구역에서 작업을 진행하세요.
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ 새 기능: 라우트 재진입 시 stats 갱신
  const user = useAuthStore((s) => s.user);

  const [workStatus, setWorkStatus] = useState<WorkStatus>("WORKING");
  const [savedTime, setSavedTime] = useState<string>("—:—:—");
  const [stats, setStats] = useState<Stats>({ done: 0, issue: 0, waiting: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const [zoneLabel, setZoneLabel] = useState<string>("Zone ?");
  const [zoneStatusText, setZoneStatusText] = useState<string>("근무중");

  // ✅ 진행중 작업(있으면 이어하기)
  const [isTaskChecking, setIsTaskChecking] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // ✅ 1) 홈 진입 시 출근/시간/구역/상태 + 진행중 작업 동기화 (기능 유지)
  useEffect(() => {
    setTitle("홈");

    (async () => {
      try {
        const res = await workLogApi.current();
        const body = res.data as ApiResponse<WorkLogData>;
        const cur = body?.data;

        if (!cur || cur.currentStatus === "END") {
          navigate("/worker/attend", { replace: true });
          return;
        }

        // 출근 시간
        if (cur.startedAt) {
          const t = formatHHmm(cur.startedAt);
          setSavedTime(t);
          localStorage.setItem("worker_attend_time", t);
        } else {
          const t = localStorage.getItem("worker_attend_time");
          if (t) setSavedTime(t);
        }

        // 상태
        const uiStatus = mapBackendStatusToUi(cur.currentStatus);
        setWorkStatus(uiStatus);
        setZoneStatusText(uiStatus === "WORKING" ? "근무중" : "근무중단");

        // 구역
        setZoneLabel(zoneLabelFromAssignedId(cur.assignedZoneId));

        // ✅ 진행중 작업 조회
        setIsTaskChecking(true);
        try {
          const active = await taskService.getMyActiveTask();
          const payload = active?.data?.payload;

          if (
            active.success &&
            payload &&
            typeof payload.batchTaskId === "number" &&
            payload.batchTaskId > 0
          ) {
            setActiveTaskId(payload.batchTaskId);
          } else {
            setActiveTaskId(null);
          }
        } catch {
          setActiveTaskId(null);
        } finally {
          setIsTaskChecking(false);
        }
      } catch (e: any) {
        const status = e.response?.status;
        if (status === 403) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          navigate("/login", { replace: true });
          return;
        }

        const t = localStorage.getItem("worker_attend_time");
        if (t) setSavedTime(t);

        console.error("근무 상태 조회 실패:", e);
      }
    })();
  }, [setTitle, navigate]);

  // ✅ 2) 통계 로드: 새 코드 기능 유지(라우트 재진입 시 갱신)
  useEffect(() => {
    taskService
      .getWorkStats()
      .then(setStats)
      .catch((err) => console.error("통계 로드 실패:", err));
  }, [location.key]);

  const workStats = useMemo(
    () => [
      { id: "done", label: "완료 작업", value: stats.done, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
      { id: "issue", label: "전체 이슈", value: stats.issue, icon: <AlertCircle className="w-5 h-5 text-rose-500" /> },
    ],
    [stats]
  );

  // ✅ 새 작업/이어하기 버튼 클릭
  const onTaskButtonClick = () => {
    navigate("/worker/task/loading");
  };

  // ✅ 중단/재개는 백 반영 (기능 유지)
  const onPause = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await workLogApi.pause("휴식");
      setWorkStatus("PAUSED");
      setZoneStatusText("근무중단");
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 403) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { replace: true });
      } else {
        alert("근무 중단에 실패했습니다.");
      }
      console.error("중단 실패:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const onResume = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await workLogApi.resume();
      setWorkStatus("WORKING");
      setZoneStatusText("근무중");
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 403) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { replace: true });
      } else {
        alert("근무 재개에 실패했습니다.");
      }
      console.error("재개 실패:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ 퇴근 처리 (기능 유지)
  const onCheckout = async () => {
    if (isProcessing) return;
    if (!window.confirm("정말 퇴근하시겠습니까?\n오늘의 통계가 초기화됩니다.")) return;

    setIsProcessing(true);
    try {
      await workLogApi.end();

      localStorage.removeItem("worker_attend_time");
      localStorage.removeItem("work_stats");

      setSavedTime("—:—:—");
      setStats({ done: 0, issue: 0, waiting: 0 });
      setActiveTaskId(null);

      alert("퇴근 처리가 완료되었습니다.");
      navigate("/worker/attend", { replace: true });
    } catch (e: any) {
      console.error("퇴근 처리 실패:", e);
      const status = e.response?.status;

      if (status === 403) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { replace: true });
      } else {
        alert("서버 오류로 퇴근 처리에 실패했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaused = workStatus === "PAUSED";
  const hasActiveTask = typeof activeTaskId === "number" && activeTaskId > 0;

  const taskBtnDisabled = isPaused || isProcessing || isTaskChecking;

  const taskBtnLabel = isTaskChecking
    ? "작업 확인 중..."
    : hasActiveTask
    ? "작업 이어서 하기"
    : "새로운 작업 시작";


  return (
    <div className="space-y-4 pb-4 flex flex-col min-h-full relative">
      <div className="px-1">
        <h1 className="text-[26px] font-black tracking-tight text-slate-900 pl-2">
          {user?.name ?? "작업자"}님
        </h1>
        <p className="text-[15px] font-semibold text-slate-400 pl-2">
          안녕하세요! 오늘의 작업을 시작하세요.
        </p>
      </div>

      {/* 출근 카드 (예전 디자인) */}
      <section
        className="
          rounded-[32px]
          bg-gradient-to-br from-[#304FFF] to-[#2539CC]
          p-7
          shadow-[0_10px_40px_-2px_rgba(48,79,255,0.5)]
          relative
          overflow-hidden
        "
      >
        {/* Subtle decorative background element */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col">
            <p className="text-[15px] font-bold text-blue-50/80 mb-1">출근 시간</p>
            <p className="text-[38px] font-black leading-none tracking-tight text-white tabular-nums">
              {savedTime}
            </p>
          </div>

          <div 
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-black shadow-sm transition-colors duration-500 ${
              workStatus === "WORKING" 
              ? "bg-[#22C55E] text-white" 
              : "bg-amber-400 text-white"
            }`}
          >
            <div className={`h-2 w-2 rounded-full bg-white ${workStatus === "WORKING" ? "animate-pulse" : ""}`} />
            {zoneStatusText}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 relative z-10">
          <button
            type="button"
            className={`
              h-13
              py-3
              rounded-2xl
              text-[15px]
              font-black
              transition-all
              active:scale-[0.98]
              disabled:opacity-50
              ${workStatus === "WORKING" 
                ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" 
                : "bg-white text-blue-700 shadow-xl"
              }
            `}
            onClick={workStatus === "WORKING" ? onPause : onResume}
            disabled={isProcessing}
          >
            {workStatus === "WORKING" ? "중단" : "다시 시작"}
          </button>

          <button
            type="button"
            className="
              h-13
              py-3
              rounded-2xl
              bg-white/10
              text-[15px]
              font-black
              text-white/90
              hover:bg-red-500/20
              hover:text-white
              transition-all
              active:scale-[0.98]
              disabled:opacity-50
              border border-white/5
            "
            onClick={onCheckout}
            disabled={isProcessing}
          >
            퇴근
          </button>
        </div>
      </section>

      {/* 근무 구역 (예전 디자인) */}
      <ZoneCard zone={zoneLabel} />

      {/* 작업 통계 (예전 디자인) */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-black text-slate-900">작업 통계량</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {workStats.map((s) => (
            <div key={s.id} className="group relative rounded-[28px] bg-white p-5 border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color: s.id === 'done' ? '#10b981' : '#f43f5e' }} />
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${s.id === 'done' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {s.icon}
                </div>
                <p className="text-[13px] font-black text-slate-400 tracking-tight">{s.label}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-[32px] font-black text-slate-900 leading-none tracking-tighter">
                    {s.value}
                </p>
                <p className="text-[13px] font-bold text-slate-300">건</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 작업 시작/이어하기 (예전 디자인) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onTaskButtonClick}
          className={`flex h-20 w-full items-center justify-between rounded-[24px] px-6 text-left shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 ${
            taskBtnDisabled 
            ? "bg-slate-100 border border-slate-200" 
            : "bg-slate-800 text-white shadow-slate-200"
          }`}
          disabled={taskBtnDisabled}
        >
          <div className="flex flex-col">
            <span className={`text-lg font-black ${taskBtnDisabled ? "text-slate-400" : "text-white"}`}>
              {taskBtnLabel}
            </span>
            <span className={`text-[11px] font-bold opacity-80 ${taskBtnDisabled ? "text-slate-400" : "text-white"}`}>
              {hasActiveTask ? "진행 중인 업무를 확인하세요" : "새로운 업무를 배정받으세요"}
            </span>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${taskBtnDisabled ? "bg-slate-200" : "bg-white/20"}`}>
            <ChevronRight className={`w-6 h-6 ${taskBtnDisabled ? "text-slate-400" : "text-white"}`} strokeWidth={3} />
          </div>
        </button>
      </div>

      <footer className="mt-auto py-3 text-center text-xs font-bold tracking-[0.2em] text-slate-200">
        LOOKie
      </footer>
    </div>
  );
}
