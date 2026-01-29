import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";

// ✅ 서버 기준 상태
type WorkState = "READY" | "WORKING" | "PAUSED";

type WorkStatusResponse = {
  state: WorkState;
  workedSeconds?: number; // 있으면 사용 (지금은 사용 안해도 됨)
};

/**
 * TODO(백 연동): 오늘 근무 상태 조회 API로 교체
 * - 예: GET /worker/work-status
 * 응답: { state: "WORKING", workedSeconds: 31500, checkInAt: "2026-01-29T08:45:00+09:00" }
 */
async function getWorkStatus(): Promise<WorkStatusResponse> {
  // 🔸 지금 백 API가 없으면 아래를 임시로 사용
  return { state: "WORKING", workedSeconds: 0 };
}

/**
 * TODO(백 연동): 중단/재개/퇴근 API로 교체
 */
async function pauseWork() {
  // await fetch("/api/worker/pause", { method: "POST" });
}
async function resumeWork() {
  // await fetch("/api/worker/resume", { method: "POST" });
}
async function checkOut() {
  // await fetch("/api/worker/checkout", { method: "POST" });
}

// ✅ ISO 시간을 "HH:MM"로 표시
function formatHHMM(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Home() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();

  const [state, setState] = useState<WorkState>("READY");
  const [loading, setLoading] = useState(false);

  // ✅ 임시: 출근 시간(localStorage)
  const [checkInAt, setCheckInAt] = useState<string | null>(null);

  useEffect(() => {
    setTitle("홈");
  }, [setTitle]);

  // ✅ 홈 진입 시 서버 상태 조회 + localStorage 출근시간 읽기
  useEffect(() => {
    (async () => {
      try {
        const res = await getWorkStatus();
        setState(res.state);
      } catch (e) {
        console.error("근무 상태 조회 실패", e);
        setState("READY");
      } finally {
        setCheckInAt(localStorage.getItem("checkInAt"));
      }
    })();
  }, []);

  // ✅ 표시할 출근시간 텍스트
  const checkInText = useMemo(() => {
    if (state === "READY") return "—";
    if (!checkInAt) return "—";
    return formatHHMM(checkInAt);
  }, [state, checkInAt]);

  // ✅ 오늘의 작업 더미
  const today = {
    done: 53,
    issues: 10,
    waiting: 2,
  };

  // ✅ 상태별 버튼 라벨/색상
  const primaryLabel =
    state === "READY" ? "근무 시작" : state === "WORKING" ? "중단" : "재개";

  const primaryStyle =
    state === "READY"
      ? "bg-[#2F5BFF] text-white"
      : state === "WORKING"
      ? "bg-white text-[#F59E0B] border border-[#F59E0B]"
      : "bg-[#2F5BFF] text-white";

  const rightLabel = state === "READY" ? null : "퇴근";
  const rightStyle = "bg-[#FF6B57] text-white";

  const pillLabel =
    state === "READY" ? "시작 전" : state === "WORKING" ? "근무중" : "일시중단";

  const pillStyle =
    state === "READY"
      ? "bg-gray-100 text-gray-600"
      : state === "WORKING"
      ? "bg-[#E8EEFF] text-[#2F5BFF]"
      : "bg-[#FFF3E6] text-[#F59E0B]";

  const handlePrimary = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (state === "READY") {
        navigate("/worker/attend");
        return;
      }

      if (state === "WORKING") {
        await pauseWork();
        setState("PAUSED");
        return;
      }

      await resumeWork();
      setState("WORKING");
    } catch (e) {
      console.error("근무 상태 변경 실패", e);
      alert("요청 처리에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await checkOut();
      setState("READY");
      localStorage.removeItem("checkInAt");
      setCheckInAt(null);
    } catch (e) {
      console.error("퇴근 실패", e);
      alert("퇴근 처리에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 상단 카드 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <span className="text-[#2F5BFF] text-lg">⏱️</span>
            </div>

            <div>
              <p className="text-xs text-gray-500">오늘의 출근 시간</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {checkInText}
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${pillStyle}`}
          >
            {pillLabel}
          </span>
        </div>

        {/* 버튼 영역 */}
        <div
          className={`mt-4 ${state === "READY" ? "" : "grid grid-cols-2 gap-2"}`}
        >
          <button
            type="button"
            className={`h-12 w-full rounded-xl font-semibold ${primaryStyle} ${
              loading ? "opacity-60 pointer-events-none" : ""
            }`}
            onClick={handlePrimary}
          >
            {loading ? "처리 중..." : primaryLabel}
          </button>

          {rightLabel && (
            <button
              type="button"
              className={`h-12 w-full rounded-xl font-semibold ${rightStyle} ${
                loading ? "opacity-60 pointer-events-none" : ""
              }`}
              onClick={handleCheckout}
            >
              퇴근
            </button>
          )}
        </div>
      </section>

      {/* ✅ 오늘의 작업 카드 (키움) */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">오늘의 작업</h2>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard icon="📦" value={today.done} label="처리한 작업" tone="mint" />
          <StatCard icon="🧾" value={today.issues} label="전체 이슈" tone="blue" />
          <StatCard
            icon="⏳"
            value={today.waiting}
            label="처리 대기중"
            tone="yellow"
          />
        </div>
      </section>

      {/* ✅ 새로운 작업 시작 (그레이 프레임) */}
      <button
        type="button"
        onClick={() => navigate("/worker/work-history")}
        className="
          w-full rounded-2xl
          bg-gray-50
          px-4 py-4
          flex items-center justify-between
          hover:bg-gray-100
          transition
        "
      >
        <span className="text-sm font-semibold text-gray-900">
          새로운 작업 시작
        </span>
        <span className="text-gray-400 text-xl">›</span>
      </button>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: number;
  label: string;
  tone: "mint" | "blue" | "yellow";
}) {
  const toneClass =
    tone === "mint"
      ? "bg-[#E9FBF4]"
      : tone === "blue"
      ? "bg-[#EEF2FF]"
      : "bg-[#FFF7E6]";

  const iconBg =
    tone === "mint"
      ? "bg-[#CFF5E6]"
      : tone === "blue"
      ? "bg-[#DCE5FF]"
      : "bg-[#FFECC7]";

  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <span className="text-sm">{icon}</span>
      </div>

      {/* ✅ 숫자 강조 */}
      <p className="mt-4 text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="mt-1 text-[12px] text-gray-600">{label}</p>
    </div>
  );
}
