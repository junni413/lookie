import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";

type AssignedTask = { zone: string; line: string; count: number };

export default function ToteScan() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const task = (state as { task?: AssignedTask })?.task;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);

  useEffect(() => {
    setTitle("토트 스캔");
  }, [setTitle]);

  // 직접 진입/새로고침 방어
  useEffect(() => {
    if (!task) navigate("/worker/home", { replace: true });
  }, [task, navigate]);

  useEffect(() => {
    if (!task) return;

    const start = async () => {
      try {
        setError(null);

        // ✅ 기본 카메라로 먼저 오픈 (권한/디바이스ID 이슈 방지)
        const reader = new BrowserMultiFormatReader();

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined, // ✅ 중요: deviceId 대신 undefined
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText();

              // ✅ 중복 호출 방지
              if (scanned) return;

              setScanned(text);

              // ✅ 스캔 성공 → 작업 상세(상품 정보) 페이지로 이동
              navigate("/worker/task/work-detail", {
                replace: true,
                state: {
                  task,
                  toteBarcode: text,
                },
              });
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

      {/* 데모/개발용: 직접 입력해서 이동 */}
      <button
        type="button"
        className="h-12 w-full rounded-2xl border bg-white text-sm font-semibold"
        onClick={() =>
          navigate("/worker/task/work-detail", {
            replace: true,
            state: { task, toteBarcode: "TOTE-TEST-0001" },
          })
        }
      >
        (개발용) 토트 스캔 성공 처리
      </button>
    </div>
  );
}
