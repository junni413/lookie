import { useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import { TASK_ERROR_MESSAGES, type TaskErrorCode } from "@/types/task";

type NextAction = "SCAN_TOTE" | "SCAN_LOCATION" | string;

export default function TaskAssignLoading() {
  const navigate = useNavigate();
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const didRunRef = useRef(false);

  useEffect(() => setTitle("작업 할당"), [setTitle]);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    const normalizeTask = (payload: any) => {
      // WorkDetail / ScanStart에서 쓰는 최소 task shape
      return {
        batchTaskId: payload.batchTaskId,
        batchId: payload.batchId,
        zoneId: payload.zoneId,
        workerId: payload.workerId,
        toteId: payload.toteId,
        toteBarcode: payload.toteBarcode,
        status: payload.status,
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        currentLocationId: payload.currentLocationId,
        actionStatus: payload.actionStatus,
      } as any;
    };

    const goByNextAction = (
      active: Awaited<ReturnType<typeof taskService.getMyActiveTask>>
    ) => {
      const payload = active.data.payload;
      const task = normalizeTask(payload);
      const nextItem = active.data.nextItem;

      const nextAction: NextAction =
        (active.data.nextAction as any) ??
        (payload.actionStatus as any) ??
        "SCAN_LOCATION";

      // ✅ 1) 토트 스캔 필요 → WorkDetail 금지 (scan-start로 복구)
      if (nextAction === "SCAN_TOTE") {
        navigate("/worker/task/scan-start", {
          replace: true,
          state: { task, nextItem },
        });
        return;
      }

      // ✅ 2) WorkDetail로 가려면 toteBarcode가 있어야 함 (이제 API에서 내려줌)
      const toteBarcode =
        payload.toteBarcode && String(payload.toteBarcode).trim().length > 0
          ? payload.toteBarcode
          : null;

      if (!toteBarcode) {
        // [Fix] 토트 바코드가 없더라도, DB상 상태가 SCAN_TOTE라면 복구 시도
        if (payload.actionStatus === "SCAN_TOTE" || nextAction === "SCAN_TOTE") {
          console.log("⚠️ Tote missing but actionStatus is SCAN_TOTE -> Redirecting to scan-start");
          navigate("/worker/task/scan-start", {
            replace: true,
            state: { task, nextItem },
          });
          return;
        }

        alert("토트 정보가 없어 작업을 복구할 수 없습니다. 홈에서 다시 시작해주세요.");
        navigate("/worker/home", { replace: true });
        return;
      }

      navigate("/worker/task/work-detail", {
        replace: true,
        state: {
          task,
          toteBarcode,
          nextAction,
          nextItem,
        },
      });
    };

    const fetchTask = async () => {
      try {
        // ✅ 1) 먼저 진행중 작업 확인
        try {
          const active = await taskService.getMyActiveTask();
          const payload = active?.data?.payload;

          if (
            active.success &&
            payload &&
            typeof payload.batchTaskId === "number" &&
            payload.batchTaskId > 0
          ) {
            goByNextAction(active);
            return;
          }
        } catch {
          // active 조회 실패(404 등)면 아래 새 작업 할당 시도
        }

        // ✅ 2) 새 작업 할당 시도
        const response = await taskService.startTask();

        if (response.success && response.data) {
          const task = normalizeTask(response.data.payload);
          const nextItem = response.data.nextItem;

          // 대기 통계 (UI용): 작업이 할당되었으므로 1개 추가
          await taskService.addWaitingTasks(1);

          navigate("/worker/task/scan-start", {
            replace: true,
            state: { task, nextItem },
          });
          return;
        }

        const msg = response.errorCode
          ? TASK_ERROR_MESSAGES[response.errorCode as TaskErrorCode] ||
          response.message
          : response.message || "작업 할당에 실패했습니다.";

        throw new Error(msg);
      } catch (error: any) {
        // ✅ 3) 이미 진행 중(409) → active 재조회로 복구
        const msg = String(error?.message ?? "");
        const status = error?.response?.status ?? error?.status;

        if (msg.includes("이미 진행 중인 작업") || status === 409) {
          try {
            const active = await taskService.getMyActiveTask();
            const payload = active?.data?.payload;

            if (
              active.success &&
              payload &&
              typeof payload.batchTaskId === "number" &&
              payload.batchTaskId > 0
            ) {
              goByNextAction(active);
              return;
            }
          } catch {
            // 재조회 실패 시 fallback
          }
        }

        console.error("Task assign error:", error);
        alert(
          error?.message ||
          "작업을 할당받지 못했습니다. 잠시 후 다시 시도해주세요."
        );
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
      <p className="text-xs font-medium text-gray-400">
        진행 중 작업이 있으면 자동으로 복구합니다.
      </p>
    </div>
  );
}
