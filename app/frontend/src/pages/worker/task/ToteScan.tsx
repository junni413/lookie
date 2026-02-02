import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
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

  useEffect(() => {
    setTitle("토트 스캔");
  }, [setTitle]);

  // 직접 진입/새로고침 방어
  useEffect(() => {
    if (!task) navigate("/worker/home", { replace: true });
  }, [task, navigate]);

  const handleScanSuccess = async (barcode: string) => {
    if (scanned) return;
    setScanned(true);

    try {
      const response = await taskService.scanTote(task!.batchTaskId, barcode);
      if (response.success && response.data) {
        // 성공 시 작업 상세 페이지로 이동
        navigate("/worker/task/work-detail", {
          replace: true,
          state: {
            task: response.data.payload,
            toteBarcode: barcode,
            nextAction: response.data.nextAction,
            nextItem: response.data.nextItem,
          },
        });
      } else {
        throw new Error(response.message || "토트 등록에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Tote scan error:", err);
      alert(err.message || "토트 등록 중 오류가 발생했습니다.");
      setScanned(false); // 재시도 허용
    }
  };

  useEffect(() => {
    if (!task) return;

    const start = async () => {
      try {
        setError(null);
        const reader = new BrowserMultiFormatReader();

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (result) {
              handleScanSuccess(result.getText());
              return;
            }

            // ✅ "NotFoundException"은 스캔 중 계속 발생(정상) → 무시
            if (err) {
              const name = (err as any)?.name;
              if (name !== "NotFoundException") {
                console.log("zxing error:", err);
              }
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
      // ✅ 카메라 종료
      controlsRef.current?.stop();
      controlsRef.current = null;

      // ✅ 추가 안전장치: video track 강제 종료
      const v = videoRef.current;
      const stream = (v?.srcObject as MediaStream | null) ?? null;
      stream?.getTracks().forEach((t) => t.stop());
      if (v) v.srcObject = null;
    };
    // scanned는 deps에 넣으면 decode가 재시작될 수 있어 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, navigate]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">
          토트 바코드를 카메라에 비춰주세요.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          인식되면 자동으로 다음 화면으로 넘어갑니다.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
        <video
          ref={videoRef}
          className="h-[360px] w-full object-cover"
          autoPlay
          muted
          playsInline
        />
      </div>

      {error && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        className="h-12 w-full rounded-2xl border bg-white text-sm font-semibold"
        onClick={() => handleScanSuccess("TOTE-TEST-0001")}
      >
        (개발용) 토트 스캔 성공 처리
      </button>
    </div>
  );
}
