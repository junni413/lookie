import { useNavigate, useOutletContext } from "react-router-dom";
import { useEffect } from "react";

type Ctx = { setTitle: (t: string) => void };

export default function AttendPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  useEffect(() => {
    setTitle("출근하기");
  }, [setTitle]);

  return (
    <div className="h-full flex items-center justify-center px-5">
      <button
        type="button"
        onClick={() => navigate("/worker/home")}
        aria-label="출근하기"
        className="
          w-[220px] h-[150px]
          rounded-[28px]
          bg-blue-600 text-white
          shadow-[0_18px_30px_rgba(37,99,235,0.25)]
          active:scale-[0.98]
          transition
          relative
          overflow-hidden
        "
      >
        {/* 살짝 하이라이트 */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 to-transparent pointer-events-none" />

        {/* ✅ 내부 컨텐츠: 위(텍스트) / 아래(원형 버튼) 분리 */}
        <div className="relative h-full flex flex-col items-center justify-center gap-3">
          <div className="text-[18px] font-semibold tracking-tight">
            출근하기
          </div>

          <div
            className="
              w-10 h-10 rounded-full
              bg-white/18
              flex items-center justify-center
              shadow-[0_10px_18px_rgba(0,0,0,0.12)]
            "
            aria-hidden="true"
          >
            <span className="text-white text-lg leading-none">{">"}</span>
          </div>
        </div>
      </button>
    </div>
  );
}
