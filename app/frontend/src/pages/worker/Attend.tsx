import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { workLogApi } from "@/services/attend.api";
import type { ApiResponse, WorkLogData, WorkLogStatus } from "@/services/attend.api";

type Ctx = { setTitle: (t: string) => void };

// ✅ 시간은 무조건 이 함수로만 포맷 (UTC(Z) -> 브라우저 로컬(KST) 표시)
function formatHHmmKST(isoLike: string) {
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
    <div className="h-full relative flex flex-col items-center justify-center px-5 overflow-hidden">
      {/* Background Sensory Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-3xl -z-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-[28px] font-black tracking-tighter text-slate-800 leading-tight">
          오늘의 작업을<br />시작할 준비가 되셨나요?
        </h2>
        <p className="mt-3 text-[13px] font-bold text-slate-400">
          근무를 시작하려면 아래 버튼을 눌러주세요
        </p>
      </motion.div>

      <div className="relative">
        {/* Pulsating Ring */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.05, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#304FFF] rounded-[44px]"
        />

        <motion.button
          type="button"
          onClick={handleAttend}
          disabled={loading}
          whileTap={{ scale: 0.96 }}
          className={`
            relative z-10
            w-[240px] h-[240px]
            rounded-[48px]
            bg-gradient-to-br from-[#304FFF] to-[#2539CC]
            text-white
            flex flex-col items-center justify-center gap-4
            shadow-[0_25px_50px_rgba(48,79,255,0.4)]
            transition-all duration-300
            disabled:opacity-60 disabled:pointer-events-nonegroup
          `}
        >
          <div className="text-center">
            <span className="block text-[24px] font-black tracking-tight leading-none mb-1">
              {loading ? "인증 중..." : "출근하기"}
            </span>
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 text-[11px] font-black text-slate-300 tracking-[0.3em]"
      >
        LOOKie
      </motion.p>
    </div>
  );
}
