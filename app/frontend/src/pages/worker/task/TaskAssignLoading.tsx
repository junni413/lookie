import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import { TASK_ERROR_MESSAGES, type TaskErrorCode } from "@/types/task";

export default function TaskAssignLoading() {
  const navigate = useNavigate();
  const { setTitle } = useOutletContext<MobileLayoutContext>();

  useEffect(() => setTitle("작업 할당"), [setTitle]);

  useEffect(() => {
    const goWorkDetailWithActive = (active: Awaited<ReturnType<typeof taskService.getMyActiveTask>>) => {
      const payload = active.data.payload;

      // ✅ WorkDetail이 state.task + state.toteBarcode를 강제하므로 최소값을 만들어서 전달
      const task = {
        batchTaskId: payload.batchTaskId,
        batchId: payload.batchId,
        zoneId: payload.zoneId,
        workerId: payload.workerId,
        toteId: payload.toteId,
        status: payload.status,
        startedAt: payload.startedAt,
        // WorkDetail이 task.itemCount 같은 걸 쓰면 여기에 넣어야 함 (없으면 생략)
      } as any;

      const toteBarcode = `TOTE-00${payload.toteId}`; // 서버가 barcode 문자열을 안 주므로 임시 대체

      navigate("/worker/task/work-detail", {
        replace: true,
        state: {
          task,
          toteBarcode,
          nextAction: (active.data.nextAction as any) ?? (payload.actionStatus as any) ?? "SCAN_LOCATION",
        },
      });
    };

    const fetchTask = async () => {
      try {
        // ✅ 1) 먼저 진행중 작업 확인 -> 있으면 work-detail로 (state까지 맞춰서)
        try {
          const active = await taskService.getMyActiveTask();
          const payload = active?.data?.payload;

          if (active.success && payload && typeof payload.batchTaskId === "number" && payload.batchTaskId > 0) {
            goWorkDetailWithActive(active);
            return;
          }
        } catch {
          // active 조회 실패(404 등)면 아래 새 작업 할당 시도
        }

        // ✅ 2) 새 작업 할당 시도
        const response = await taskService.startTask();

        if (response.success && response.data) {
          const task = response.data.payload;

          // 대기 통계 (UI용)
          await taskService.addWaitingTasks(task.itemCount || 1);

          navigate("/worker/task/scan-start", {
            replace: true,
            state: { task },
          });
          return;
        }

        const msg = response.errorCode
          ? TASK_ERROR_MESSAGES[response.errorCode as TaskErrorCode] || response.message
          : response.message || "작업 할당에 실패했습니다.";

        throw new Error(msg);
      } catch (error: any) {
        // ✅ 3) 백이 "이미 진행 중인 작업"이라고 막으면 -> active 재조회 후 work-detail 복구
        const msg = String(error?.message ?? "");
        const status = error?.response?.status ?? error?.status;

        if (msg.includes("이미 진행 중인 작업") || status === 409) {
          try {
            const active = await taskService.getMyActiveTask();
            const payload = active?.data?.payload;

            if (active.success && payload && typeof payload.batchTaskId === "number" && payload.batchTaskId > 0) {
              goWorkDetailWithActive(active);
              return;
            }
          } catch {
            // 재조회 실패하면 아래 fallback
          }
        }

        console.error("Task assign error:", error);
        alert(error?.message || "작업을 할당받지 못했습니다. 잠시 후 다시 시도해주세요.");
        navigate("/worker/home", { replace: true });
      }
    };

    fetchTask();
  }, [navigate, setTitle]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
      <p className="text-sm font-semibold text-gray-900">작업 확인 중</p>
      <p className="text-xs font-medium text-gray-400">진행 중 작업이 있으면 자동으로 복구합니다.</p>
    </div>
  );
}
