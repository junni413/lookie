// app/frontend/src/pages/worker/issue/IssueResult.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import VideoCallModal from "./VideoCallModal";
import { issueService, type IssueDetail } from "@/services/issueService";
import type { IssueType } from "./IssueReport";
import { useToast } from "@/components/ui/use-toast";

type AiVerdict = "OK" | "DAMAGED" | "NEED_REVIEW";

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
  if (!detail || !detail.aiResult) return "NEED_REVIEW";

  // 1) 관리자 확정이 있으면 그걸 최우선
  if (detail.adminDecision === "NORMAL") return "OK";
  if (detail.adminDecision === "DAMAGED") return "DAMAGED";

  // 2) AI 결과 텍스트로 휴리스틱
  const txt = detail.aiResult || "";
  if (txt.includes("파손")) return "DAMAGED";
  if (txt.includes("정상") || txt.includes("양호")) return "OK";

  // 3) 그 외는 검토 필요
  return "NEED_REVIEW";
}

export default function IssueResult() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const nav = useLocation().state as NavState | undefined;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [adminResolved, setAdminResolved] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [analyzing, setAnalyzing] = useState(true);

  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle("AI 판정 결과");
  }, [setTitle]);

  // ✅ Polling Logic
  useEffect(() => {
    if (!nav) {
      navigate("/worker/home", { replace: true });
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const fetchDetail = async () => {
      try {
        const res = await issueService.getIssue(nav.issueId);
        if (res.success && res.data) {
          setDetail(res.data);

          // AI Result가 있으면 분석 완료로 간주
          if (res.data.aiResult) {
            setAnalyzing(false);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // 초기 호출
    fetchDetail();

    // 2초마다 폴링
    intervalId = setInterval(fetchDetail, 2000);

    return () => clearInterval(intervalId);
  }, [nav, navigate]);

  const verdict = useMemo(() => verdictFromDetail(detail), [detail]);

  if (!nav) return null;

  const connectAdmin = () => {
    setConnectionAttempted(true);
    setShowVideoCall(true);
  };

  const handleSendToAdmin = () => {
    setAdminResolved(true);
    setShowVideoCall(false);
    toast({
      title: "관리자에게 전송되었습니다.",
      description: "관리자가 확인 후 처리할 것입니다. 다음 작업을 진행하세요.",
    });
  };

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

      // 3. Polling will continue (or restart if we reset the effect deps, but here state change triggers re-render)
      // Actually the useEffect depends on nav, which hasn't changed.
      // But verifying logic: useEffect sets interval. 
      // When we setAnalyzing(true), we just update UI. 
      // The Interval is strictly bound to `nav` and `navigate`. 
      // However, we cleared interval when `aiResult` was found.
      // We need to RESTART polling.
      // Simple way: Force re-mount or add a dependency to useEffect. 
      // I will add `analyzing` to dependency to restart polling if it goes back to true.

    } catch (err) {
      console.error(err);
      toast({ title: "재촬영 요청 실패", description: "다시 시도해주세요." });
      setAnalyzing(false); // 실패시 다시 결과 보여주기
    }
  };

  // const needsAdmin = verdict === "DAMAGED" || verdict === "NEED_REVIEW";
  // const isNextDisabled = needsAdmin && !adminResolved && !connectionAttempted;

  // Analyzing일 때는 버튼 비활성화
  const isNextDisabled = analyzing || ((verdict === "DAMAGED" || verdict === "NEED_REVIEW") && !adminResolved && !connectionAttempted);

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

      {/* 이미지 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-2xl border">
          {/* 재촬영 시 이미지가 바뀌진 않음 (nav.imageUrl 그대로) - 개선하려면 detail.imageUrl 사용 */}
          <img src={detail?.imageUrl || nav.imageUrl} alt="evidence" className="h-56 w-full object-cover" />
        </div>

        <p className="mt-3 text-xs text-gray-500">상품명</p>
        <p className="text-sm font-extrabold">{nav.product.productName}</p>

        {!analyzing && detail && (
          <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
            <p>AI 분석: {detail.aiResult}</p>
            <p>신뢰도: {detail.confidence ? (detail.confidence * 100).toFixed(1) : 0}%</p>
            {detail.summary && <p>요약: {detail.summary}</p>}
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
            className={`h-12 rounded-2xl font-extrabold transition-all ${adminResolved ? "bg-blue-600 text-white" : "bg-blue-600 text-white"}`}
          >
            {connectionAttempted ? "관리자 다시 연결하기" : "관리자 연결하기"}
          </button>
        )}

        {/* Retake Button if applicable */}
        {!analyzing && (detail?.availableActions?.includes("RETAKE") || verdict === "NEED_REVIEW") && (
          <button
            onClick={handleRetake}
            className="h-12 rounded-2xl border-2 border-blue-100 bg-white font-extrabold text-blue-600"
          >
            다시 촬영하기
          </button>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={isNextDisabled}
          className={`h-12 rounded-2xl font-extrabold transition-all ${isNextDisabled ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white"}`}
        >
          작업 이어 진행하기
        </button>
      </div>

      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        onSendToAdmin={handleSendToAdmin}
      />
    </div>
  );
}
