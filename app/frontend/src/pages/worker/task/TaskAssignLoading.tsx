import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";

type AssignedTask = {
  zone: string;
  line: string;
  count: number;
};

export default function TaskAssignLoading() {
  const navigate = useNavigate();
  const { setTitle } = useOutletContext<MobileLayoutContext>();

  useEffect(() => {
    setTitle("작업 할당");
  }, [setTitle]);

  useEffect(() => {
    const t = setTimeout(() => {
      const task: AssignedTask = { zone: "A-2", line: "L-05", count: 24 };

      // ✅ 핵심: state로 task 넘겨야 scan-start가 렌더됨
      navigate("/worker/task/scan-start", {
        replace: true,
        state: { task },
      });
    }, 900);

    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
      <p className="text-sm font-semibold text-gray-900">새로운 작업 할당 중</p>
    </div>
  );
}
