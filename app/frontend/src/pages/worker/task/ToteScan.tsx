import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import type { TaskVO } from "@/types/task";

export default function ToteScan() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const task = (state as { task?: TaskVO })?.task;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);

  useEffect(() => setTitle("토트 스캔"), [setTitle]);

  useEffect(() => {
    if (!task) {
      navigate("/worker/home", { replace: true });
      return;
    }

    // 이미 토트 스캔 단계가 아니라면 작업 상세로 이동
    if (task.actionStatus && task.actionStatus !== "SCAN_TOTE") {
      navigate("/worker/task/work-detail", {
        replace: true,
        state: {
          task,
          toteBarcode: task.toteId ? `TOTE-00${task.toteId}` : undefined,
          nextAction: task.actionStatus,
        },
      });
    }
  }, [task, navigate]);

  const handleScanSuccess = async (barcode: string) => {
    if (!task) return;
    if (scanned) return;
    setScanned(true);

    try {
      // 서버 상태 재확인 (클라 상태 불일치 방지)
      const active = await taskService.getMyActiveTask();
      const payload = active?.data?.payload;
      if (
        active?.success &&
        payload &&
        typeof payload.batchTaskId === "number" &&
        payload.batchTaskId > 0 &&
        payload.actionStatus &&
        payload.actionStatus !== "SCAN_TOTE"
      ) {
        navigate("/worker/task/work-detail", {
          replace: true,
          state: {
            task: payload,
            toteBarcode: payload.toteId ? `TOTE-00${payload.toteId}` : undefined,
            nextAction: payload.actionStatus,
          },
        });
        return;
      }

      console.log("ToteScan request:", {
        taskId: task.batchTaskId,
        actionStatus: task.actionStatus,
        barcode,
      });
      // ✅ taskId = batchTaskId 그대로 사용 (백 엔드포인트가 taskId를 받음)
      const response = await taskService.scanTote(task.batchTaskId, barcode);

      if (response.success && response.data) {
        navigate("/worker/task/work-detail", {
          replace: true,
          state: {
            task: response.data.payload,
            toteBarcode: barcode,
            nextAction: response.data.nextAction,
            nextItem: response.data.nextItem,
          },
        });
        return;
      }

      throw new Error(response.message || "토트 등록에 실패했습니다.");
    } catch (err: any) {
      console.error("Tote scan error:", err);
      if (err?.response) {
        console.error("Tote scan error response:", err.response?.status, err.response?.data);
      }
      if (err?.response?.data?.errorCode === "TASK_005") {
        try {
          const active = await taskService.getMyActiveTask();
          const payload = active?.data?.payload;
          if (
            active?.success &&
            payload &&
            typeof payload.batchTaskId === "number" &&
            payload.batchTaskId > 0
          ) {
            navigate("/worker/task/work-detail", {
              replace: true,
              state: {
                task: payload,
                toteBarcode: payload.toteId ? `TOTE-00${payload.toteId}` : undefined,
                nextAction: payload.actionStatus,
              },
            });
            return;
          }
        } catch {
          // ignore
        }
      }
      alert(err?.message || "토트 등록 중 오류가 발생했습니다.");
      // 연속 요청 방지 (서버 409/429 스팸 방지)
      setTimeout(() => setScanned(false), 800);
    }
  };

  useEffect(() => {
    if (!task) return;

    const start = async () => {
      try {
        setError(null);
        const reader = new BrowserMultiFormatReader();

        // The decodeFromVideoDevice method already accepts 3 arguments:
        // 1. deviceId (optional, can be undefined)
        // 2. videoElement
        // 3. callback function
        // The current usage already conforms to this signature.
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined, // deviceId (undefined to let the library choose)
          videoRef.current!, // videoElement
          (result, err) => { // callback function
            if (result) {
              handleScanSuccess(result.getText());
              return;
            }

            if (err) {
              const name = (err as any)?.name;
              if (name !== "NotFoundException") console.log("zxing error:", err);
            }
          }
        );
      } catch (e) {
        console.log("camera open error:", e);
        setError("카메라를 열 수 없어요. 브라우저 권한/장치 점검이 필요해요.");
      }
    };

    start();

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;

      const v = videoRef.current;
      const stream = (v?.srcObject as MediaStream | null) ?? null;
      stream?.getTracks().forEach((t) => t.stop());
      if (v) v.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">토트 바코드를 카메라에 비춰주세요.</p>
        <p className="mt-1 text-xs text-gray-500">인식되면 자동으로 다음 화면으로 넘어갑니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
        <video ref={videoRef} className="h-[360px] w-full object-cover" autoPlay muted playsInline />
      </div>

      {error && <div className="rounded-2xl border bg-white p-4 text-sm text-red-600">{error}</div>}
    </div>
  );
}
