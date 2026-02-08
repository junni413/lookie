// app/frontend/src/pages/worker/issue/IssueReport.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { useToast } from "@/components/ui/use-toast";
import { issueService } from "@/services/issueService";
import { Camera, Image as RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

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
  const location = useLocation();
  const nav = (location.state as NavState | undefined) || (
    // ✅ 세션 복구 1순위: localStorage fallback (React Router state 유실 대비)
    JSON.parse(localStorage.getItem("latest_issue_state") || "null") as NavState | null
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nav || !nav.product) {
      console.error("❌ [IssueReport] Missing navigation state");
    }
  }, [nav]);

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

  if (!nav) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-6">
        <div className="p-4 bg-amber-50 rounded-full">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
        </div>
        <div>
          <p className="text-xl font-black text-gray-900">이슈 정보가 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400 font-medium">잘못된 접근이거나 세션이 만료되었습니다.</p>
        </div>
        <button onClick={() => navigate(-1)} className="w-full max-w-[200px] h-14 bg-slate-900 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all">
          이전으로 돌아가기
        </button>
      </div>
    );
  }

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
      const uploadRes = await issueService.uploadImage(file);
      if (!uploadRes.success) {
        toast({ title: "이미지 업로드 실패", description: uploadRes.message });
        return;
      }
      const imageUrl = uploadRes.data;

      const issueRes = await issueService.createIssue({
        taskId: batchTaskId,        // ✅ 백엔드는 taskId로 받음
        taskItemId: batchTaskItemId, // ✅ 백엔드는 taskItemId로 받음
        issueType: nav.issueType,
        imageUrl,
      });

      if (!issueRes.success) {
        toast({ title: "이슈 접수 실패", description: issueRes.message });
        return;
      }

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
          batchTaskId, // ✅ FSM API에 필요
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
    <div className="space-y-5 px-1 pb-10">
      {/* 상품 정보 카드 */}
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-slate-900 leading-tight line-clamp-2">
              {nav?.product?.productName || "상품 정보 없음"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">바코드</p>
                <p className="text-[13px] font-bold text-slate-600">{nav?.product?.barcode || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">위치</p>
                <p className="text-[13px] font-bold text-slate-600">{nav?.product?.locationCode || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">토트</p>
                <p className="text-[13px] font-bold text-blue-600/80">{nav?.toteBarcode || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 촬영/업로드 영역 */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-[15px] font-black text-slate-900">{TITLE[nav.issueType]}</p>
        </div>
        <p className="text-xs text-slate-400 font-medium">파손 부위가 잘 보이도록 촬영해 주세요.</p>

        <div className="mt-5">
          {!previewUrl ? (
            <button
              type="button"
              onClick={openPicker}
              className="group relative flex h-72 w-full flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-100 bg-slate-50 transition-all active:scale-95 hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm transition-transform group-hover:scale-110">
                <Camera className="h-8 w-8 text-slate-400 group-hover:text-blue-500" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-500 group-hover:text-blue-600">사진 촬영 / 갤러리 선택</p>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-[32px] border border-slate-100 shadow-sm">
              <img src={previewUrl} alt="preview" className="h-72 w-full object-cover" />
              <button
                type="button"
                onClick={openPicker}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md active:scale-90 transition-transform"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="mt-8">
            {!previewUrl ? (
              <button
                type="button"
                onClick={openPicker}
                className="flex w-full h-15 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-black text-white shadow-[0_8px_20px_-8px_rgba(59,130,246,0.5)] active:scale-[0.98] transition-all"
              >
                <Camera className="h-5 w-5" />
                촬영 / 선택하기
              </button>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={submitIssue}
                  disabled={loading}
                  className="flex w-full h-15 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-black text-white shadow-[0_8px_20px_-8px_rgba(59,130,246,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      이슈 접수 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      이슈 접수 완료하기
                    </>
                  )}
                </button>
                {!loading && (
                  <button
                    type="button"
                    onClick={openPicker}
                    className="flex w-full h-15 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white py-4 text-base font-bold text-slate-600 active:scale-[0.98] transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    다시 촬영하기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
