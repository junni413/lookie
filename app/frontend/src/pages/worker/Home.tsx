import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";
import { taskService } from "../../services/taskService";
import { workLogApi } from "@/services/attend.api";
import type { ApiResponse, WorkLogData, WorkLogStatus } from "@/services/attend.api";

type WorkStatus = "WORKING" | "PAUSED";
type Stats = { done: number; issue: number; waiting: number };

// ✅ 시간 포맷 통일 (UTC(Z) -> 브라우저 로컬(KST) 표시)
function formatHHmmKST(isoLike: string) {
  const hasTZ = /$|[+\-]\d{2}:\d{2}$/.test(isoLike);
  const safeIso = hasTZ ? isoLike : `${isoLike}Z`;

  const d = new Date(safeIso);
  return d.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}


function zoneLabelFromId(zoneId: number | null | undefined) {
  if (zoneId === null || zoneId === undefined) return "ZONE-?";
  return `ZONE-${zoneId}`;
}

function mapBackendStatusToUi(status: WorkLogStatus): WorkStatus {
  if (status === "PAUSE") return "PAUSED";
  return "WORKING"; // START/RESUME
}

// 구역 카드
function ZoneCard({ zone }: { zone: string; }) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">오늘 근무 구역</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[16px] font-black text-slate-900">{zone}</div>
          <div className="mt-1 text-[12px] font-semibold text-slate-400">
            작업 시작 전 구역이 맞는지 확인해주세요.
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700">
          배정 완료
        </span>
      </div>
    </section>
  );
}

export default function Home() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [workStatus, setWorkStatus] = useState<WorkStatus>("WORKING");
  const [savedTime, setSavedTime] = useState<string>("— —");
  const [stats, setStats] = useState<Stats>({ done: 0, issue: 0, waiting: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const [zoneLabel, setZoneLabel] = useState<string>("ZONE-?");
  const [zoneStatusText, setZoneStatusText] = useState<string>("근무중");

  // ✅ 진행중 작업(있으면 이어하기)
  const [isTaskChecking, setIsTaskChecking] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  useEffect(() => {
    setTitle("홈");

    // ✅ 1) 홈 진입 시 current로 출근 여부/시간/구역/상태 동기화
    (async () => {
      try {
        const res = await workLogApi.current();
        const body = res.data as ApiResponse<WorkLogData>;
        const cur = body?.data;

        if (!cur || cur.currentStatus === "END") {
          navigate("/worker/attend", { replace: true });
          return;
        }

        // ✅ 출근 시간은 startedAt 기준(항상 로컬 포맷으로)
        if (cur.startedAt) {
          const t = formatHHmmKST(cur.startedAt);
          setSavedTime(t);
          localStorage.setItem("worker_attend_time", t); // fallback
        } else {
          const t = localStorage.getItem("worker_attend_time");
          if (t) setSavedTime(t);
        }

        // 상태
        const uiStatus = mapBackendStatusToUi(cur.currentStatus);
        setWorkStatus(uiStatus);
        setZoneStatusText(uiStatus === "WORKING" ? "근무중" : "근무중단");

        // ✅ 구역: "ZONE-<id>"
        setZoneLabel(zoneLabelFromId(cur.assignedZoneId));

        // ✅ 1-2) 출근 상태가 정상일 때만 "진행중 작업" 조회
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
          // active task 조회 실패/없음(404 등) => 없음 처리
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

        // current 실패 시: 로컬 저장값이라도 표시
        const t = localStorage.getItem("worker_attend_time");
        if (t) setSavedTime(t);

        console.error("근무 상태 조회 실패:", e);
      }
    })();

    // ✅ 2) 통계 로드
    taskService
      .getWorkStats()
      .then(setStats)
      .catch((err) => console.error("통계 로드 실패:", err));
  }, [setTitle, navigate]);

  const workStats = useMemo(
    () => [
      { id: "done", label: "처리한 작업", value: stats.done, icon: "📦" },
      { id: "issue", label: "전체 이슈", value: stats.issue, icon: "🧾" },
      { id: "waiting", label: "처리 대기 중", value: stats.waiting, icon: "⏳" },
    ],
    [stats]
  );

  // ✅ 새 작업/이어하기 버튼 클릭
  const onTaskButtonClick = () => {
    navigate("/worker/task/loading");
  };

  // ✅ 중단/재개는 백 반영
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

  // ✅ 퇴근 처리
  const onCheckout = async () => {
    if (isProcessing) return;
    if (!window.confirm("정말 퇴근하시겠습니까?\n오늘의 통계가 초기화됩니다.")) return;

    setIsProcessing(true);
    try {
      await workLogApi.end();

      localStorage.removeItem("worker_attend_time");
      localStorage.removeItem("work_stats");

      setSavedTime("— —");
      setStats({ done: 0, issue: 0, waiting: 0 });

      // ✅ 퇴근하면 "진행중 작업"도 의미 없으니 리셋
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

  const statusChipClass =
    workStatus === "WORKING"
      ? "rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
      : "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";

  const isPaused = workStatus === "PAUSED";
  const hasActiveTask = typeof activeTaskId === "number" && activeTaskId > 0;

  const taskBtnDisabled = isPaused || isProcessing || isTaskChecking;

  const taskBtnLabel = isTaskChecking
    ? "작업 확인 중..."
    : hasActiveTask
      ? "작업 이어서하기"
      : "새로운 작업 시작";

  const taskHelpText = isPaused
    ? "근무가 중단된 상태에서는 작업을 진행할 수 없어요."
    : !isTaskChecking && hasActiveTask
      ? "진행 중인 작업이 있어요. 이어서 진행할 수 있어요."
      : "";

  return (
    <div className="space-y-4">
      {/* 인사 */}
      <div className="px-1 pt-2">
        <h1 className="text-[26px] font-black tracking-tight text-slate-900">
          {user?.name ?? "작업자"}님
        </h1>
        <p className="mt-1 text-[13px] font-semibold text-slate-400">
          안녕하세요! 오늘의 작업을 시작하세요.
        </p>
      </div>

      <section
        className="
          rounded-[28px]
          bg-blue-600
          p-5
          shadow-[0_20px_40px_rgba(37,99,235,0.35)]
        "
        >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/20 text-lg">
              ⏱️
            </div>
            <div>
              <p className="text-sm font-extrabold text-blue-100">오늘의 출근 시간</p>
              <p className="mt-1 text-[28px] font-black leading-none tracking-tight text-white">
                {savedTime}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold text-white">
            {zoneStatusText}
          </span>
        </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="
            h-11
            rounded-[18px]
            bg-white
            text-sm
            font-black
            text-blue-700
            active:scale-[0.99]
            transition
            disabled:opacity-50
          "
          onClick={workStatus === "WORKING" ? onPause : onResume}
          disabled={isProcessing}
        >
          {workStatus === "WORKING" ? "중단" : "재개"}
        </button>

        <button
          type="button"
          className="
            h-11
            rounded-[18px]
            bg-white/20
            text-sm
            font-black
            text-white
            active:scale-[0.99]
            transition
            disabled:opacity-50
          "
          onClick={onCheckout}
          disabled={isProcessing}
        >
          퇴근
        </button>
      </div>
      </section>


      {/* 근무 구역 */}
      <ZoneCard zone={zoneLabel}/>

      {/* 작업 통계 */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-black text-slate-900">오늘의 작업</h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {workStats.map((s) => (
            <div key={s.id} className="rounded-[22px] bg-slate-50 p-3 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-base">
                {s.icon}
              </div>
              <p className="mt-3 text-[26px] font-black leading-none text-slate-900">
                {s.value}
              </p>
              <p className="mt-2 text-[12px] font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ 작업 시작/이어하기 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onTaskButtonClick}
          className="flex h-14 w-full items-center justify-between rounded-[22px] border border-slate-100 bg-white px-5 text-left shadow-sm active:scale-[0.99] transition disabled:opacity-60"
          disabled={taskBtnDisabled}
        >
          <span
            className={`text-sm font-extrabold ${
              taskBtnDisabled ? "text-slate-400" : "text-slate-900"
            }`}
          >
            {taskBtnLabel}
          </span>
          <span className="text-[22px] text-slate-300">›</span>
        </button>

        {taskHelpText && (
          <p className="px-1 text-[12px] font-semibold text-slate-400">{taskHelpText}</p>
        )}
      </div>
    </div>
  );
}
