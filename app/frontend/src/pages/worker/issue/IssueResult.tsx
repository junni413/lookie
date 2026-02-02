import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import type { IssueType, AiVerdict } from "./IssueReport";
import VideoCallModal from "./VideoCallModal";

type NavState = {
  issueType: IssueType;
  toteBarcode: string;
  product: { productName: string; barcode: string; locationCode: string };
  imageUrl: string;
  verdict: AiVerdict;
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

export default function IssueResult() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const nav = useLocation().state as NavState | undefined;
  const navigate = useNavigate();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);

  useEffect(() => {
    if (!nav) navigate("/worker/home", { replace: true });
  }, [nav, navigate]);

  useEffect(() => {
    setTitle("AI 판정 결과");
  }, [setTitle]);

  if (!nav) return null;

  const goNext = () => {
    navigate(-2);
  };

  const connectAdmin = () => {
    setShowVideoCall(true);
    setAdminConnected(true);
  };

  const needsAdmin = nav.verdict === "DAMAGED" || nav.verdict === "NEED_REVIEW";
  const isNextDisabled = needsAdmin && !adminConnected;

  return (
    <div className="space-y-4">
      {/* 이미지 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-2xl border">
          <img src={nav.imageUrl} alt="evidence" className="h-56 w-full object-cover" />
        </div>

        <p className="mt-3 text-xs text-gray-500">상품명</p>
        <p className="text-sm font-extrabold">{nav.product.productName}</p>
      </section>

      {/* 결과 카드 */}
      <ResultCard verdict={nav.verdict} />

      {/* 버튼 */}
      <div className="grid gap-3">
        {(nav.verdict === "DAMAGED" || nav.verdict === "NEED_REVIEW") && (
          <button
            type="button"
            onClick={connectAdmin}
            disabled={adminConnected}
            className={`h-12 rounded-2xl font-extrabold transition-all ${adminConnected
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-600 text-white"
              }`}
          >
            {adminConnected ? "관리자 연결됨" : "관리자 연결하기"}
          </button>
        )}

        {(nav.verdict === "OK" || nav.verdict === "DAMAGED") && (
          <button
            type="button"
            onClick={goNext}
            disabled={isNextDisabled}
            className={`h-12 rounded-2xl font-extrabold transition-all ${isNextDisabled
              ? "bg-gray-200 text-gray-400"
              : "bg-blue-600 text-white"
              }`}
          >
            다음 작업 진행
          </button>
        )}

        {nav.verdict === "NEED_REVIEW" && (
          <button
            type="button"
            onClick={() => navigate("/worker/issue/report", { state: nav })}
            disabled={adminConnected}
            className="h-12 rounded-2xl border bg-white font-extrabold disabled:opacity-50"
          >
            다시 촬영
          </button>
        )}
      </div>

      {/* Video Call Modal */}
      <VideoCallModal isOpen={showVideoCall} onClose={() => setShowVideoCall(false)} />
    </div>
  );
}
