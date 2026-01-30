import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { useToast } from "@/components/ui/use-toast";

export type IssueType = "DAMAGED" | "MISSING" | "OTHER";
export type AiVerdict = "OK" | "DAMAGED" | "NEED_REVIEW";

type NavState = {
  issueType: IssueType;
  toteBarcode: string;
  product: { name: string; sku: string; location: string };
};

const TITLE: Record<IssueType, string> = {
  DAMAGED: "상품 파손 신고",
  MISSING: "재고 없음 신고",
  OTHER: "기타 이슈 신고",
};

function fakeAiVerdict(): AiVerdict {
  const r = Math.random();
  if (r < 0.34) return "OK";
  if (r < 0.67) return "DAMAGED";
  return "NEED_REVIEW";
}

export default function IssueReport() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const nav = useLocation().state as NavState | undefined;
  const navigate = useNavigate();
  const { toast } = useToast();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nav) navigate("/worker/home", { replace: true });
  }, [nav, navigate]);

  useEffect(() => {
    if (nav) setTitle(TITLE[nav.issueType]);
  }, [nav, setTitle]);

  // preview url 관리
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!nav) return null;

  const openCamera = () => fileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const requestAi = async () => {
    if (!file || !previewUrl) {
      toast({ title: "사진을 촬영(또는 선택)해주세요." });
      return;
    }
    setLoading(true);
    try {
      // TODO: 실제 AI API로 교체
      // const form = new FormData()
      // form.append("image", file)
      // form.append("sku", nav.product.sku)
      // form.append("issueType", nav.issueType)
      // const res = await fetch("/api/ai/issue/analyze", { method:"POST", body: form })
      // const data = await res.json()

      const verdict = fakeAiVerdict();

      navigate("/worker/issue/result", {
        state: {
          issueType: nav.issueType,
          toteBarcode: nav.toteBarcode,
          product: nav.product,
          imageUrl: previewUrl,
          verdict,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold">{nav.product.name}</p>
        <p className="mt-1 text-xs text-gray-500">SKU: {nav.product.sku}</p>
        <p className="mt-1 text-xs text-gray-500">위치: {nav.product.location}</p>
        <p className="mt-2 text-xs text-gray-500">토트: {nav.toteBarcode}</p>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold">상품 파손 신고</p>
        <p className="mt-1 text-xs text-gray-500">
          파손된 상품 사진을 촬영해주세요.
          <br />
          AI가 파손 상태를 판단합니다.
        </p>

        <div className="mt-4">
          {!previewUrl ? (
            <button
              type="button"
              onClick={openCamera}
              className="relative flex h-64 w-full items-center justify-center rounded-2xl bg-slate-800 text-white"
            >
              <div className="text-center">
                <div className="text-2xl">📷</div>
                <div className="mt-2 text-sm text-white/80">카메라 영역</div>
              </div>
            </button>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <img src={previewUrl} alt="preview" className="h-64 w-full object-cover" />
            </div>
          )}

          {/* 안드로이드: 카메라 바로 뜨게 */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="mt-4 grid gap-3">
            {!previewUrl ? (
              <button
                type="button"
                onClick={openCamera}
                className="h-12 rounded-2xl bg-blue-600 font-extrabold text-white"
              >
                촬영
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={requestAi}
                  disabled={loading}
                  className="h-12 rounded-2xl bg-blue-600 font-extrabold text-white disabled:opacity-60"
                >
                  {loading ? "AI 판정 중..." : "AI 파손 판정 요청"}
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={loading}
                  className="h-12 rounded-2xl border bg-white font-extrabold disabled:opacity-60"
                >
                  다시 촬영
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
