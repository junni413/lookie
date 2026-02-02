import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import { TASK_ERROR_MESSAGES, type TaskErrorCode } from "@/types/task";

export default function TaskAssignLoading() {
  const navigate = useNavigate();
  const { setTitle } = useOutletContext<MobileLayoutContext>();

  useEffect(() => {
    setTitle("작업 할당");
  }, [setTitle]);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await taskService.startTask();
        if (response.success && response.data) {
          // backend ApiResponse -> TaskResponse -> payload(TaskVO)
          const task = response.data.payload;

          // 대기 중인 작업 통계 업데이트 (상품 수 기준)
          await taskService.addWaitingTasks(task.itemCount || 1);

          navigate("/worker/task/scan-start", {
            replace: true,
            state: { task },
          });
        } else {
          const msg = response.errorCode
            ? (TASK_ERROR_MESSAGES[response.errorCode as TaskErrorCode] || response.message)
            : (response.message || "작업 할당에 실패했습니다.");
          throw new Error(msg);
        }
      } catch (error: any) {
        console.error("Task assign error:", error);
        alert(error.message || "작업을 할당받지 못했습니다. 잠시 후 다시 시도해주세요.");
        navigate("/worker/home", { replace: true });
      }
    };

    fetchTask();
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
