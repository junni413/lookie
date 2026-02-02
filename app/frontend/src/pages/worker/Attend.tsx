import { useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { attend } from "@/services/attend.api";

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
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      localStorage.setItem("worker_attend_time", timeStr);

      await attend();
      navigate("/worker/home");
    } catch (e) {
      console.error("출근 처리 실패", e);
      alert("출근 처리에 실패했어요.");
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
