import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import IssueSelectSheet, { type IssueType } from "./IssueSelectDrawer";
import { useToast } from "@/components/ui/use-toast";

type AssignedTask = { zone: string; line: string; count: number };

async function reportIssue(params: {
  type: IssueType;
  toteBarcode: string;
  sku: string;
  location: string;
}) {
  // TODO: 백 API로 교체
  const res = await fetch("/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let msg = "이슈 신고에 실패했습니다.";
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json().catch(() => ({}));
}

export default function WorkDetail() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useToast();

  const task = (state as any)?.task as AssignedTask | undefined;
  const toteBarcode = (state as any)?.toteBarcode as string | undefined;

  const [issueOpen, setIssueOpen] = useState(false);
  const [sendingIssue, setSendingIssue] = useState<IssueType | null>(null);

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  useEffect(() => {
    if (!task || !toteBarcode) navigate("/worker/home", { replace: true });
  }, [task, toteBarcode, navigate]);

  if (!task || !toteBarcode) return null;

  // ✅ 프론트 더미 상품 데이터 (나중에 API)
  const product = {
    name: "[K365] 유명산지 고당도 사과",
    sku: "SKU-887421_KR",
    location: "A-12-03",
  };

  const handleIssueSelect = async (type: IssueType) => {
    // 전송 중이면 무시
    if (sendingIssue) return;

    // ✅ 상품 파손은 "사진 촬영/업로드" 화면으로 이동
    if (type === "DAMAGED") {
      setIssueOpen(false);
      navigate("/worker/issue/report", {
        state: {
          issueType: type,
          toteBarcode,
          product, // { name, sku, location }
        },
      });
      return;
    }

    // ✅ 재고 없음/기타는 즉시 신고 + 토스트
    setSendingIssue(type);
    try {
      await reportIssue({
        type,
        toteBarcode,
        sku: product.sku,
        location: product.location,
      });

      toast({
        title: "이슈 신고가 접수되었습니다.",
        description: "관리자가 확인 후 처리합니다.",
      });

      setIssueOpen(false);
    } catch (e: any) {
      toast({
        title: "이슈 신고 실패",
        description: e?.message ?? "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setSendingIssue(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">토트 스캔 완료</p>
          <p className="mt-1 text-xs text-gray-500">
            토트 바코드: {toteBarcode}
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-lg font-extrabold">지번과 상품을 스캔해주세요.</p>

          <div className="mt-4 flex gap-3">
            <div className="h-28 w-28 rounded-2xl bg-gray-100" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">상품명</p>
              <p className="text-sm font-extrabold">{product.name}</p>

              <p className="mt-3 text-xs text-gray-500">상품 코드</p>
              <p className="text-sm font-extrabold">{product.sku}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="h-20 rounded-2xl border bg-white text-sm font-semibold"
            >
              지번 스캔
              <div className="mt-1 text-xs text-gray-500">{product.location}</div>
            </button>
            <button
              type="button"
              className="h-20 rounded-2xl border bg-white text-sm font-semibold"
            >
              상품 스캔
              <div className="mt-1 text-xs text-gray-500">{product.location}</div>
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => setIssueOpen(true)}
              disabled={!!sendingIssue}
              className="h-14 rounded-2xl bg-yellow-300 text-base font-extrabold disabled:opacity-60"
            >
              이슈 발생 신고
            </button>

            <button
              type="button"
              className="h-14 rounded-2xl bg-blue-600 text-base font-extrabold text-white"
            >
              다음 작업 진행
            </button>
          </div>
        </section>
      </div>

      <IssueSelectSheet
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onSelect={handleIssueSelect}
        loadingKey={sendingIssue}
      />
    </>
  );
}
