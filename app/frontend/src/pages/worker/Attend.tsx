// src/pages/worker/AttendPage.tsx
import { useOutletContext } from "react-router-dom";
import { useEffect } from "react";

type Ctx = { setTitle: (t: string) => void };

export default function AttendPage() {
  const { setTitle } = useOutletContext<Ctx>();

  useEffect(() => {
    setTitle("출근하기");
  }, [setTitle]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border">
        <div className="text-sm font-semibold">출근 체크</div>
        <div className="mt-2 text-sm text-gray-500">
          (임시 화면) 출근 기능은 추후 연동 예정입니다.
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-2xl bg-blue-600 py-4 text-white font-semibold hover:bg-blue-700"
        onClick={() => alert("TODO: 출근 API 연동")}
      >
        출근하기
      </button>
    </div>
  );
}
