import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";
import { taskService } from "../../services/taskService";
import { workLogApi } from "../../services/attend.api"; // API 추가

type WorkStatus = "WORKING" | "PAUSED";
type Stats = { done: number; issue: number; waiting: number };

// 구역 카드 컴포넌트
function ZoneCard({
  zone,
  status,
}: {
  zone: string;
  status: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">오늘 근무 구역</p>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
          <span className="text-[18px] font-black">{zone}</span>
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-black text-slate-900">{zone}구역</div>
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
  const [isProcessing, setIsProcessing] = useState(false); // API 처리 상태

  // 임시 근무 구역 데이터
  const mockZone = {
    zone: "A",
    status: "근무중",
  };

  useEffect(() => {
    setTitle("홈");

    // 1. 로컬 스토리지에서 출근 시간 로드
    const t = localStorage.getItem("worker_attend_time");
    if (t) setSavedTime(t);

    // 2. 통계 데이터 로드
    taskService.getWorkStats()
      .then(setStats)
      .catch((err) => console.error("통계 로드 실패:", err));
  }, [setTitle]);

  const workStats = [
    { id: "done", label: "처리한 작업", value: stats.done, icon: "📦" },
    { id: "issue", label: "전체 이슈", value: stats.issue, icon: "🧾" },
    { id: "waiting", label: "처리 대기 중", value: stats.waiting, icon: "⏳" },
  ];

  const onStartNewTask = () => navigate("/worker/task/loading");
  const onPause = () => setWorkStatus("PAUSED");
  const onResume = () => setWorkStatus("WORKING");

  // ✅ 백엔드 연동 퇴근 처리
  const onCheckout = async () => {
    if (isProcessing) return;
    if (!window.confirm("정말 퇴근하시겠습니까?\n오늘의 통계가 초기화됩니다.")) return;

    setIsProcessing(true);
    try {
      // 1. 서버에 퇴근 요청 전송
      await workLogApi.end();

      // 2. 성공 시 로컬 스토리지 데이터 및 상태 초기화
      localStorage.removeItem("worker_attend_time");
      localStorage.removeItem("work_stats");
      localStorage.removeItem("my_issues");
      
      setSavedTime("— —");
      setStats({ done: 0, issue: 0, waiting: 0 });

      alert("퇴근 처리가 완료되었습니다.");
      navigate("/worker/attend");
    } catch (e: any) {
      console.error("퇴근 처리 실패:", e);
      const status = e.response?.status;
      
      if (status === 403) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login");
      } else {
        alert("서버 오류로 퇴근 처리에 실패했습니다. (OpenVidu 연결 확인)");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const statusChipClass =
    workStatus === "WORKING"
      ? "rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
      : "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";

  return (
    <div className="space-y-4">
      {/* 인사 섹션 */}
      <div className="px-1 pt-2">
        <h1 className="text-[26px] font-black tracking-tight text-slate-900">
          {user?.name ?? "작업자"}님
        </h1>
        <p className="mt-1 text-[13px] font-semibold text-slate-400">
          안녕하세요! 오늘의 작업을 시작하세요.
        </p>
      </div>

      {/* 출근 카드 */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-50 text-lg">
              ⏱️
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">오늘의 출근 시간</p>
              <p className="mt-1 text-[28px] font-black leading-none tracking-tight text-slate-900">
                {savedTime}
              </p>
            </div>
          </div>
          <span className={statusChipClass}>
            {workStatus === "WORKING" ? "근무중" : "근무중단"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-11 rounded-[18px] border border-slate-200 bg-white text-sm font-extrabold text-slate-700 active:scale-[0.99] transition disabled:opacity-50"
            onClick={workStatus === "WORKING" ? onPause : onResume}
            disabled={isProcessing}
          >
            {workStatus === "WORKING" ? "중단" : "재개"}
          </button>

          <button
            type="button"
            className="h-11 rounded-[18px] border border-red-200 bg-red-50 text-sm font-extrabold text-red-600 active:scale-[0.99] transition disabled:opacity-50"
            onClick={onCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "퇴근"}
          </button>
        </div>
      </section>

      {/* 근무 구역 카드 */}
      <ZoneCard zone={mockZone.zone} status={mockZone.status as any} />

      {/* 오늘의 작업 통계 */}
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

      {/* 새로운 작업 시작 버튼 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onStartNewTask}
          className="flex h-14 w-full items-center justify-between rounded-[22px] border border-slate-100 bg-white px-5 text-left shadow-sm active:scale-[0.99] transition disabled:opacity-60"
          disabled={workStatus === "PAUSED" || isProcessing}
        >
          <span className={`text-sm font-extrabold ${workStatus === "PAUSED" ? "text-slate-400" : "text-slate-900"}`}>
            새로운 작업 시작
          </span>
          <span className="text-[22px] text-slate-300">›</span>
        </button>
        {workStatus === "PAUSED" && (
          <p className="px-1 text-[12px] font-semibold text-slate-400">
            근무가 중단된 상태에서는 새로운 작업을 시작할 수 없어요.
          </p>
        )}
      </div>
    </div>
  );
}