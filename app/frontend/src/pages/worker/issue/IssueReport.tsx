// app/frontend/src/pages/worker/issue/IssueReport.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { useToast } from "@/components/ui/use-toast";
import { issueService } from "@/services/issueService";

export type IssueType = "DAMAGED" | "OUT_OF_STOCK";

type NavState = {
  issueType: IssueType;
  toteBarcode: string;
  product: {
    productName: string;
    barcode: string;
    locationCode: string;
    batchTaskId: number;
    batchTaskItemId: number;
  };
};

const TITLE: Record<IssueType, string> = {
  DAMAGED: "상품 파손 신고",
  OUT_OF_STOCK: "재고 없음 신고",
};

export default function IssueReport() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const nav = useLocation().state as NavState | undefined;
  const navigate = useNavigate();
  const { toast } = useToast();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ 방어: state 없이 들어오면 홈으로
  useEffect(() => {
    if (!nav) navigate("/worker/home", { replace: true });
  }, [nav, navigate]);

  useEffect(() => {
    if (nav) setTitle(TITLE[nav.issueType]);
  }, [nav, setTitle]);

  // ✅ 미리보기 URL
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

  const openPicker = () => fileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const submitIssue = async () => {
    if (!file) {
      toast({ title: "사진을 촬영하거나 선택해주세요." });
      return;
    }

    // ✅ 필수값 방어
    const { batchTaskId, batchTaskItemId } = nav.product;
    if (typeof batchTaskId !== "number" || typeof batchTaskItemId !== "number") {
      toast({
        title: "작업 정보 누락",
        description: "batchTaskId / batchTaskItemId가 필요합니다.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1) 업로드 → URL 받기
      const uploadRes = await issueService.uploadImage(file);
      if (!uploadRes.success) {
        toast({ title: "이미지 업로드 실패", description: uploadRes.message });
        return;
      }
      const imageUrl = uploadRes.data;

      // 2) 이슈 생성 (imageUrl 포함)
      const issueRes = await issueService.createIssue({
        batchTaskId,
        batchTaskItemId,
        issueType: nav.issueType,
        imageUrl,
      });

      if (!issueRes.success) {
        toast({ title: "이슈 접수 실패", description: issueRes.message });
        return;
      }

      // 3) 결과 화면 이동 (IssueResult가 issueId로 상세 조회)
      navigate("/worker/issue/result", {
        state: {
          issueId: issueRes.data.issueId,
          issueType: nav.issueType,
          toteBarcode: nav.toteBarcode,
          product: {
            productName: nav.product.productName,
            barcode: nav.product.barcode,
            locationCode: nav.product.locationCode,
          },
          imageUrl,
        },
      });
    } catch (e) {
      console.error(e);
      toast({ title: "이슈 접수 중 오류 발생" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 상품/토트 정보 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold">{nav.product.productName}</p>
        <p className="mt-1 text-xs text-gray-500">SKU: {nav.product.barcode}</p>
        <p className="mt-1 text-xs text-gray-500">위치: {nav.product.locationCode}</p>
        <p className="mt-2 text-xs text-gray-500">토트: {nav.toteBarcode}</p>
      </section>

      {/* 촬영/업로드 */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold">{TITLE[nav.issueType]}</p>
        <p className="mt-1 text-xs text-gray-500">사진을 촬영하거나 갤러리에서 선택하세요.</p>

        <div className="mt-4">
          {!previewUrl ? (
            <button
              type="button"
              onClick={openPicker}
              className="relative flex h-64 w-full items-center justify-center rounded-2xl bg-slate-800 text-white"
            >
              <div className="text-center">
                <div className="text-2xl">📷</div>
                <div className="mt-2 text-sm text-white/80">촬영 / 갤러리 선택</div>
              </div>
            </button>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <img src={previewUrl} alt="preview" className="h-64 w-full object-cover" />
            </div>
          )}

          {/* 모바일에서 카메라 뜨게: capture=environment
             - 기기/브라우저마다 갤러리만 뜨는 경우도 정상(정책/권한/지원 차이) */}
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
                onClick={openPicker}
                className="h-12 rounded-2xl bg-blue-600 font-extrabold text-white"
              >
                촬영 / 선택
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={submitIssue}
                  disabled={loading}
                  className="h-12 rounded-2xl bg-blue-600 font-extrabold text-white disabled:opacity-60"
                >
                  {loading ? "이슈 접수 중..." : "이슈 접수하기"}
                </button>
                <button
                  type="button"
                  onClick={openPicker}
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
