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
      // ✅ 저장: 현재 시간을 로컬스토리지에 (임시)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      localStorage.setItem("worker_attend_time", timeStr);

      await attend(); // ✅ 출근 처리
      navigate("/worker/home"); // ✅ 홈으로 이동
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
        className={`w-[220px] h-[150px] rounded-[28px] bg-blue-600 text-white
          shadow-[0_18px_30px_rgba(37,99,235,0.25)] active:scale-[0.98] transition
          ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {loading ? "처리 중..." : "출근하기"}
      </button>
    </div>
  );
}
