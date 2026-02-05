// app/frontend/src/pages/worker/issue/IssueResult.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { issueService, type IssueDetailData as IssueDetail } from "@/services/issueService";
import type { IssueType } from "./IssueReport";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore"; // Add callStore
import { subscribeIssueResult } from "@/services/stompService";

type AiVerdict = "OK" | "DAMAGED" | "NEED_REVIEW" | "RETAKE";

type NavState = {
  issueId: number;
  issueType: IssueType;
  toteBarcode: string;
  product: { productName: string; barcode: string; locationCode: string };
  imageUrl: string;
};

function ResultCard({ verdict }: { verdict: AiVerdict }) {
  if (verdict === "OK") {
    return (
      <div className="rounded-2xl border bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">✅</div>
          <div>
            <p className="text-sm font-extrabold">정상 상품</p>
            <p className="mt-1 text-xs text-emerald-900/70">
              파손 징후가 발견되지 않았습니다.
              <br />
              작업을 계속 진행해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verdict === "DAMAGED") {
    return (
      <div className="rounded-2xl border bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">❌</div>
          <div>
            <p className="text-sm font-extrabold">상품 파손 감지</p>
            <p className="mt-1 text-xs text-rose-900/70">
              파손 가능성이 높습니다.
              <br />
              관리자 확인이 필요합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verdict === "RETAKE") {
    return (
      <div className="rounded-2xl border bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">📸</div>
          <div>
            <p className="text-sm font-extrabold">재촬영 필요</p>
            <p className="mt-1 text-xs text-blue-900/70">
              이미지가 선명하지 않아 판정이 어렵습니다.
              <br />
              사진을 다시 촬영해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">⚠️</div>
        <div>
          <p className="text-sm font-extrabold">관리자 검토 필요</p>
          <p className="mt-1 text-xs text-amber-900/70">
            AI가 명확히 판단하지 못했습니다.
            <br />
            관리자에게 연결해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyzingCard() {
  return (
    <div className="rounded-2xl border bg-blue-50 p-6 flex flex-col items-center justify-center text-center space-y-3">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div>
        <p className="text-sm font-extrabold text-blue-900">AI 분석 중...</p>
        <p className="text-xs text-blue-600 mt-1">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

function verdictFromDetail(detail: IssueDetail | null): AiVerdict {
  if (!detail) return "NEED_REVIEW";

  // 1) 관리자 확정이 있으면 최우선
  if (detail.adminDecision === "NORMAL") return "OK";
  if (detail.adminDecision === "DAMAGED") return "DAMAGED";

  // 2) AI 결과 코드 기반 매핑
  const res = detail.aiResult;
  if (res === "PASS") return "OK";
  if (res === "FAIL") return "DAMAGED";
  if (res === "RETAKE") return "RETAKE";
  if (res === "NEED_CHECK") return "NEED_REVIEW";

  // 결과 수신 중이거나 미판정인 경우
  return "NEED_REVIEW";
}

export default function IssueResult() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const nav = useLocation().state as NavState | undefined;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [connectionAttempted, setConnectionAttempted] = useState(false);

  const { token, user } = useAuthStore();
  const startCall = useCallStore((s) => s.startCall); // Add startCall action
  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [analyzing, setAnalyzing] = useState(true);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // ✅ 실시간 크기 변화 감지 (ResizeObserver)
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === imgRef.current) {
          setDisplaySize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setTitle("AI 판정 결과");
  }, [setTitle]);

  // ✅ WebSocket(STOMP) 적용
  useEffect(() => {
    if (!nav || !token) {
      if (!nav) navigate("/worker/home", { replace: true });
      return;
    }

    // 초기 상세 정보 조회
    const fetchInitialDetail = async () => {
      try {
        const res = await issueService.getIssueDetail(nav.issueId);
        if (res) {
          setDetail(res);
          if (res.aiResult) {
            setAnalyzing(false);
          }
        }
      } catch (err) {
        console.error("Fetch detail error:", err);
      }
    };
    fetchInitialDetail();

    // WebSocket 구독 시작
    console.log(`🔌 [DEBUG] WebSocket 구독 시작: issueId=${nav.issueId}`);
    const unsubscribe = subscribeIssueResult(nav.issueId, token, (body: any) => {
      console.log("📨 [STOMP] Issue Result Received:", body);
      console.log(`🔍 [DEBUG] Before update - analyzing:`, analyzing);
      console.log(`🔍 [DEBUG] Received data - aiResult:`, body.aiResult, "reasonCode:", body.reasonCode);
      
      setDetail((prev) => {
        const updated = {
          ...(prev || {}),
          ...body,
          // Support both new (issueNextAction) and old (nextAction) field names for robustness
          issueNextAction: body.issueNextAction || body.nextAction,
          imageUrl: prev?.imageUrl || nav.imageUrl,
          productName: prev?.productName || nav.product.productName,
          locationCode: prev?.locationCode || nav.product.locationCode,
        } as IssueDetail;
        console.log(`✅ [DEBUG] Detail updated:`, updated);
        return updated;
      });
      
      setAnalyzing(false);
      console.log(`✅ [DEBUG] analyzing set to false`);
      
      // fetchInitialDetail() 제거: WebSocket 데이터를 신뢰
      // 백엔드 조회가 WebSocket보다 늦을 수 있어서 덮어쓰면 안 됨
    });

    return () => unsubscribe();
  }, [nav, navigate, token]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ w: naturalWidth, h: naturalHeight });
    // displaySize는 ResizeObserver가 담당함
  };

  const verdict = useMemo(() => {
    const result = verdictFromDetail(detail);
    console.log(`🎯 [DEBUG] Verdict calculated:`, result, "from detail:", detail);
    return result;
  }, [detail]);

  console.log(`🖼️ [DEBUG] Render - analyzing:`, analyzing, "verdict:", verdict, "detail:", detail);

  if (!nav) return null;

  const connectAdmin = async () => {
    if (!user) return;
    setConnectionAttempted(true);
    try {
      // Start auto-assignment call
      await startCall(user.userId, null, nav.issueId, "관리자");
    } catch (err) {
      console.error("Failed to start call:", err);
    }
  };

  // Note: handleSendToAdmin will now be handled via global modal or simplified logic
  // For now, if auto-assignment starts, we consider the attempt "done" for the worker flow.

  const goNext = () => {
    navigate(-2);
  };

  // ✅ Retake Logic
  const handleRetake = () => {
    fileRef.current?.click();
  };

  const onRetakeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalyzing(true); // 다시 분석 상태로 
      setDetail(null); // 기존 결과 초기화

      // 1. Upload new image
      const uploadRes = await issueService.uploadImage(file);
      if (!uploadRes.success) throw new Error(uploadRes.message);

      // 2. Call Retake API
      await issueService.retakeIssue(nav.issueId, uploadRes.data);
      // WebSocket이 있으므로 추가 조치 없이 분석 중 상태로 기다림

    } catch (err) {
      console.error(err);
      toast({ title: "재촬영 요청 실패", description: "다시 시도해주세요." });
      setAnalyzing(false); // 실패시 다시 결과 보여주기
    }
  };

  // Analyzing일 때는 버튼 비활성화
  const isNextDisabled = analyzing || ((verdict === "DAMAGED" || verdict === "NEED_REVIEW" || verdict === "RETAKE") && !connectionAttempted);

  return (
    <div className="space-y-4">
      {/* Hide inputs */}
      <input
        type="file"
        ref={fileRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onRetakeFileChange}
      />

      {/* 이미지 및 Bounding Box */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="relative flex justify-center bg-slate-100 rounded-2xl overflow-hidden border mb-4 min-h-[14rem]">
          {/* 
              [핵심] 이미지 크기에 정확히 일치하는 인라인 레이어
          */}
          <div className="relative inline-block h-fit">
            <img
              ref={imgRef}
              src={detail?.imageUrl || nav.imageUrl}
              alt="evidence"
              className="block max-w-full h-auto max-h-[60vh] object-contain rounded-sm"
              onLoad={handleImgLoad}
            />

            {/* Bounding Box Overlay */}
            {!analyzing && detail?.aiDetail && naturalSize.w > 0 && displaySize.w > 0 && (
              <div
                className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
                style={{ width: displaySize.w, height: displaySize.h }}
              >
                {(() => {
                  try {
                    const aiData = JSON.parse(detail.aiDetail);
                    if (aiData.detections && Array.isArray(aiData.detections)) {
                      const scaleX = displaySize.w / naturalSize.w;
                      const scaleY = displaySize.h / naturalSize.h;

                      return aiData.detections.map((det: any, idx: number) => {
                        if (!det.bbox || !Array.isArray(det.bbox)) return null;
                        const [x1, y1, x2, y2] = det.bbox;

                        return (
                          <div
                            key={idx}
                            className="absolute border-2 border-rose-500 bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                            style={{
                              left: `${x1 * scaleX}px`,
                              top: `${y1 * scaleY}px`,
                              width: `${(x2 - x1) * scaleX}px`,
                              height: `${(y2 - y1) * scaleY}px`,
                            }}
                          >
                            <span className="absolute -top-6 left-0 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap font-bold">
                              {det.label === 'banana_defect' ? '파손' : '감지됨'} ({(det.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        );
                      });
                    }
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-1">상세 상품 정보</p>
        <p className="text-sm font-bold truncate mb-3">{nav.product.productName}</p>

        {!analyzing && detail && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-800">
                AI 판정: {(detail.aiResult === 'FAIL' || verdict === 'DAMAGED') ? '❌ 파손 감지' : '✅ 정상'}
              </span>
              <span className="text-slate-400">신뢰도: {((detail.confidence || 0) * 100).toFixed(1)}%</span>
            </div>
            {detail.summary && <p className="mt-1 leading-relaxed">{detail.summary}</p>}
          </div>
        )}
      </section>

      {/* 결과 카드 Or 분석중 */}
      {analyzing ? (
        <AnalyzingCard />
      ) : (
        <ResultCard verdict={verdict} />
      )}

      {/* 버튼 */}
      <div className="grid gap-3">
        {!analyzing && (verdict === "DAMAGED" || verdict === "NEED_REVIEW") && (
          <button
            type="button"
            onClick={connectAdmin}
            className="h-12 rounded-2xl font-extrabold transition-all bg-blue-600 text-white active:scale-95 shadow-md"
          >
            {connectionAttempted ? "관리자 다시 연결하기" : "관리자 연결하기"}
          </button>
        )}

        {/* Retake Button */}
        {!analyzing && (detail?.availableActions?.includes("RETAKE") || verdict === "RETAKE" || verdict === "NEED_REVIEW") && (
          <button
            onClick={handleRetake}
            className="h-12 rounded-2xl border-2 border-blue-600 bg-white font-extrabold text-blue-600 active:scale-95 shadow-sm"
          >
            다시 촬영하기
          </button>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={isNextDisabled}
          className={`h-12 rounded-2xl font-extrabold transition-all ${isNextDisabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 active:scale-95 shadow-sm"}`}
        >
          작업 이어 진행하기
        </button>
      </div>
    </div>
  );
}
