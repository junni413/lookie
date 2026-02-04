// app/frontend/src/pages/worker/issue/IssueResult.tsx
import { useEffect, useMemo, useState } from "react";
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

function verdictFromDetail(detail: IssueDetail | null): AiVerdict {
  if (!detail) return "NEED_REVIEW";

  // 1) 관리자 확정이 있으면 그걸 최우선
  if (detail.adminDecision === "NORMAL") return "OK";
  if (detail.adminDecision === "DAMAGED") return "DAMAGED";

  // 2) 아직 확정 전이면 AI 결과 텍스트로 휴리스틱
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
  const [adminResolved, setAdminResolved] = useState(false); // 관리자 연결 또는 메시지 전송 완료 여부
  const [connectionAttempted, setConnectionAttempted] = useState(false); // 연결 시도 여부

  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle("AI 판정 결과");
  }, [setTitle]);

  useEffect(() => {
    if (!nav) {
      navigate("/worker/home", { replace: true });
      return;
    }
    setLoading(true);
    issueService
      .getIssue(nav.issueId)
      .then((res) => {
        if (res.success) setDetail(res.data);
      })
      .finally(() => setLoading(false));
  }, [nav, navigate]);

  const verdict = useMemo(() => verdictFromDetail(detail), [detail]);

  if (!nav) return null;

  const connectAdmin = () => {
    setConnectionAttempted(true);
    setShowVideoCall(true);
  };

  const handleSendToAdmin = () => {
    // 1) 백엔드에 메시지 전송 API 호출 (Mock)
    // await issueService.sendMessage(...)

    // 2) UI 상태 업데이트
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

  const needsAdmin = verdict === "DAMAGED" || verdict === "NEED_REVIEW";
  // ✅ adminResolved가 true이거나 connectionAttempted가 true면 다음 진행 가능
  const isNextDisabled = needsAdmin && !adminResolved && !connectionAttempted;

  return (
    <div className="space-y-4">
      {/* 이미지 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-2xl border">
          <img src={nav.imageUrl} alt="evidence" className="h-56 w-full object-cover" />
        </div>

        <p className="mt-3 text-xs text-gray-500">상품명</p>
        <p className="text-sm font-extrabold">{nav.product.productName}</p>

        {loading && <p className="mt-2 text-xs text-blue-500">결과 불러오는 중...</p>}

        {detail && (
          <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
            <p>AI 분석: {detail.aiResult}</p>
            <p>신뢰도: {(detail.confidence * 100).toFixed(1)}%</p>
            {detail.summary && <p>요약: {detail.summary}</p>}
          </div>
        )}
      </section>

      {/* 결과 카드 */}
      <ResultCard verdict={verdict} />

      {/* 버튼 */}
      <div className="grid gap-3">
        {(verdict === "DAMAGED" || verdict === "NEED_REVIEW") && (
          <button
            type="button"
            onClick={connectAdmin}
            // adminResolved가 true여도 '다시 연결' 가능하도록 비활성화 해제
            // disabled={adminResolved} 
            className={`h-12 rounded-2xl font-extrabold transition-all ${adminResolved ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
              }`}
          >
            {connectionAttempted ? "관리자 다시 연결하기" : "관리자 연결하기"}
          </button>
        )}

        {/* Proceed Button (Always Visible, replaces Retake) */}
        <button
          type="button"
          onClick={goNext}
          disabled={isNextDisabled}
          className={`h-12 rounded-2xl font-extrabold transition-all ${isNextDisabled ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white"
            }`}
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
