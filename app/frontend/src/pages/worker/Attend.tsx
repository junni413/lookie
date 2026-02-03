import { useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { workLogApi } from "@/services/attend.api";

type Ctx = { setTitle: (t: string) => void };

export default function AttendPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle("");
  }, [setTitle]);

  const handleAttend = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1. 서버에 출근 요청
      const res = await workLogApi.start();
      
      // 2. 서버에서 준 시작 시간을 포맷팅 (예: "09:30")
      // 서버 응답 구조가 res.data.data.startTime 인지 확인 필요
      if (res.data?.data?.startTime) {
        const startDate = new Date(res.data.data.startTime);
        const timeStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(
          startDate.getMinutes()
        ).padStart(2, "0")}`;
        
        localStorage.setItem("worker_attend_time", timeStr);
      }

      // 3. 성공 시에만 이동
      navigate("/worker/home");
    } catch (e: any) {
      console.error("출근 처리 실패", e);
      
      // 에러 메시지에 따른 분기 처리
      if (e.response?.status === 403) {
        alert("접근 권한이 없거나 토큰이 만료되었습니다. 다시 로그인해주세요.");
      } else if (e.response?.status === 500) {
        alert("서버 오류가 발생했습니다. (OpenVidu 서버 확인 필요)");
      } else {
        alert("출근 처리에 실패했어요. 이미 출근 상태인지 확인해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

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