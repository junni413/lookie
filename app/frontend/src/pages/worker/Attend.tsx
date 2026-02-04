import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { workLogApi } from "@/services/attend.api";

type Ctx = { setTitle: (t: string) => void };

// ✅ 백 응답(스웨거 기준)
type WorkLogStatus = "START" | "PAUSE" | "RESUME" | "END";
type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};
type WorkLogData = {
  workLogId: number;
  workerId: number;
  workerName: string;
  assignedZoneId: number | null;
  currentStatus: WorkLogStatus;
  startedAt: string; // ISO string (Z 포함 가능)
  endedAt?: string | null;
  plannedEndAt?: string | null;
  lastStatusChangedAt?: string | null;
  lineId?: number | null;
  locationCode?: string | null;
  workCount?: number;
  workRate?: number;
};

// ✅ 시간은 무조건 이 함수로만 포맷 (UTC(Z) -> 브라우저 로컬(KST) 표시)
function formatHHmmKST(isoLike: string) {
  // 타임존 정보가 없으면 UTC로 간주해서 Z를 붙임
  const hasTZ = /Z$|[+\-]\d{2}:\d{2}$/.test(isoLike);
  const safeIso = hasTZ ? isoLike : `${isoLike}Z`;

  const d = new Date(safeIso);
  return d.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function isWorking(status?: WorkLogStatus) {
  return status === "START" || status === "PAUSE" || status === "RESUME";
}

export default function AttendPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // ✅ 출근 페이지 진입 시: 이미 출근중이면 홈으로
  useEffect(() => {
    setTitle("");

    (async () => {
      try {
        const res = await workLogApi.current();
        const body = res.data as ApiResponse<WorkLogData>;
        const cur = body?.data;

        if (cur && isWorking(cur.currentStatus)) {
          if (cur.startedAt) {
            const t = formatHHmmKST(cur.startedAt);
            localStorage.setItem("worker_attend_time", t);
          }
          navigate("/worker/home", { replace: true });
          return;
        }
      } catch (e: any) {
        if (e.response?.status === 403) {
          alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
          navigate("/login", { replace: true });
          return;
        }
      } finally {
        setChecking(false);
      }
    })();
  }, [setTitle, navigate]);

  const handleAttend = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await workLogApi.start();
      const body = res.data as ApiResponse<WorkLogData>;
      const data = body?.data;

      // ✅ startedAt을 로컬 시간(HH:mm)으로 저장
      if (data?.startedAt) {
        const t = formatHHmmKST(data.startedAt);
        localStorage.setItem("worker_attend_time", t);
      }

      navigate("/worker/home", { replace: true });
    } catch (e: any) {
      const status = e.response?.status;

      // ✅ 이미 출근중이면(중복) current로 startedAt 받아서 저장 후 홈 이동
      if (status === 409) {
        try {
          const curRes = await workLogApi.current();
          const curBody = curRes.data as ApiResponse<WorkLogData>;
          const cur = curBody?.data;

          if (cur?.startedAt) {
            const t = formatHHmmKST(cur.startedAt);
            localStorage.setItem("worker_attend_time", t);
          }
        } catch {
          // current 실패해도 홈 이동은 유지
        }
        alert("이미 출근 처리되어 있어요.");
        navigate("/worker/home", { replace: true });
        return;
      }

      if (status === 403) {
        alert("접근 권한이 없거나 토큰이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login", { replace: true });
      } else if (status === 500) {
        alert("서버 오류가 발생했습니다.");
      } else {
        alert("출근 처리에 실패했어요.");
      }

      console.error("출근 처리 실패", e);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="h-full flex items-center justify-center px-5">
        <div className="text-sm text-gray-500">상태 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center px-5">
      <button
        type="button"
        onClick={handleAttend}
        disabled={loading}
        className={`
          w-[240px] h-[180px]
          rounded-[32px]
          bg-blue-600 text-white
          flex flex-col items-center justify-center gap-3
          shadow-[0_20px_40px_rgba(37,99,235,0.35)]
          transition-all duration-200
          active:scale-[0.97]
          disabled:opacity-60 disabled:pointer-events-none
        `}
      >
        <span className="text-[22px] font-black tracking-tight">
          {loading ? "처리 중..." : "출근하기"}
        </span>
      </button>
    </div>
  );
}
