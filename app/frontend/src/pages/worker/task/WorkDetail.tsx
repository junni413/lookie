import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import IssueSelectSheet, { type IssueType } from "./IssueSelectDrawer";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

type AssignedTask = { zone: string; line: string; count: number };

type ProductItem = {
  id: string;
  name: string;
  sku: string;
  location: string;
  qty: number;
};

// Mock Data
const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: "p1",
    name: "[K365] 유명산지 고당도 사과",
    sku: "SKU-887421_KR",
    location: "A-12-03",
    qty: 1,
  },
  {
    id: "p2",
    name: "삼성 블루투스 이어폰",
    sku: "SKU-SAMSUNG-EQ",
    location: "A-12-04",
    qty: 2,
  },
  {
    id: "p3",
    name: "로지텍 무선 마우스",
    sku: "SKU-LOGIT-MX",
    location: "A-12-05",
    qty: 1,
  },
];

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
    } catch { }
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

  // 현재 보고 있는 상품 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  useEffect(() => {
    if (!task || !toteBarcode) navigate("/worker/home", { replace: true });
  }, [task, toteBarcode, navigate]);

  if (!task || !toteBarcode) return null;

  const currentProduct = MOCK_PRODUCTS[currentIndex];
  // 마지막 아이템 여부
  const isLastItem = currentIndex === MOCK_PRODUCTS.length - 1;

  // 이전 아이템
  const prevItem = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  // 다음 아이템
  const nextItem = () => {
    if (currentIndex < MOCK_PRODUCTS.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleNextWork = () => {
    if (isLastItem) {
      alert("모든 작업이 완료되었습니다!");
      navigate("/worker/home");
    } else {
      nextItem();
      toast({
        title: "다음 상품으로 이동합니다.",
      });
    }
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
          product: currentProduct, // 현재 상품 정보 전달
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
        sku: currentProduct.sku,
        location: currentProduct.location,
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
      <div className="space-y-4 relative">
        {/* Top Left Menu Button (Absolute positioned near container top) */}
        <div className="absolute -top-12 left-0">
          <button
            onClick={() => navigate("/worker/task/list")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">토트 스캔 완료</p>
          <p className="mt-1 text-xs text-gray-500">
            토트 바코드: {toteBarcode}
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm relative">
          <p className="text-lg font-extrabold text-center">지번과 상품을 스캔해주세요.</p>

          <div className="mt-6 flex items-center gap-2">
            {/* Left Arrow */}
            <button
              onClick={prevItem}
              disabled={currentIndex === 0}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6 text-gray-400" />
            </button>

            {/* Product Card Content */}
            <div className="flex-1 flex gap-3">
              <div className="h-28 w-28 rounded-2xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">상품명</p>
                <p className="text-sm font-extrabold break-keep">{currentProduct.name}</p>

                <p className="mt-3 text-xs text-gray-500">상품 코드</p>
                <p className="text-sm font-extrabold">{currentProduct.sku}</p>
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={nextItem}
              disabled={currentIndex === MOCK_PRODUCTS.length - 1}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="h-20 rounded-2xl border bg-white text-sm font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              지번 스캔
              <div className="mt-1 text-xs text-gray-500">{currentProduct.location}</div>
            </button>
            <button
              type="button"
              className="h-20 rounded-2xl border bg-white text-sm font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              상품 스캔
              <div className="mt-1 text-xs text-gray-500">{currentProduct.location}</div>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mt-4 gap-1">
            {MOCK_PRODUCTS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "w-4 bg-gray-800" : "w-1.5 bg-gray-300"
                  }`}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => setIssueOpen(true)}
              disabled={!!sendingIssue}
              className="h-14 rounded-2xl bg-yellow-300 text-base font-extrabold disabled:opacity-60 shadow-md shadow-yellow-100 hover:bg-yellow-400 transition-colors"
            >
              이슈 발생 신고
            </button>

            <button
              type="button"
              onClick={handleNextWork}
              className="h-14 rounded-2xl bg-blue-600 text-base font-extrabold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              {isLastItem ? "작업 완료" : "다음 작업 진행"}
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
