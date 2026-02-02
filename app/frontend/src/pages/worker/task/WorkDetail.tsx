import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import IssueSelectSheet, { type IssueType } from "./IssueSelectDrawer";
import ScannerModal from "./ScannerModal"; // 추가
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, MapPin, PackageSearch, Plus, Minus } from "lucide-react";
import { taskService } from "@/services/taskService";
import type { TaskVO, TaskItemVO, NextAction, TaskErrorCode } from "@/types/task";
import { TASK_ERROR_MESSAGES } from "@/types/task";

export default function WorkDetail() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useToast();

  const task: TaskVO | undefined = state?.task;
  const toteBarcode = state?.toteBarcode as string | undefined;

  const [nextAction, setNextAction] = useState<NextAction>(state?.nextAction || "SCAN_LOCATION");
  const [items, setItems] = useState<TaskItemVO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [issueOpen, setIssueOpen] = useState(false);
  const sendingIssue: IssueType | null = null;

  // 스캐너 관련 상태
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanType, setScanType] = useState<"LOCATION" | "ITEM">("LOCATION");

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  useEffect(() => {
    if (!task || !toteBarcode) {
      navigate("/worker/home", { replace: true });
      return;
    }

    const fetchItems = async () => {
      try {
        const response = await taskService.getTaskItems(task.batchTaskId);
        if (response.success) {
          setItems(response.data);
        }
      } catch (err) {
        console.error("Fetch items error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [task, toteBarcode, navigate]);

  const currentItem = items[currentIndex];

  // 인덱스 변경 시 스캔 단계 초기화
  useEffect(() => {
    if (currentItem) {
      if (currentItem.status === "DONE") {
        setNextAction("SCAN_ITEM");
      } else {
        setNextAction("SCAN_LOCATION");
      }
    }
  }, [currentIndex, currentItem]);

  const prevItem = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const nextItemIdx = () => {
    if (currentIndex < items.length - 1) setCurrentIndex((i) => i + 1);
  };

  // 스캐너 열기
  const openLocationScanner = () => {
    setScanType("LOCATION");
    setScannerOpen(true);
  };

  const openItemScanner = () => {
    setScanType("ITEM");
    setScannerOpen(true);
  };

  // 스캔 결과 처리
  const handleScanned = useCallback(async (barcode: string) => {
    if (!currentItem || !task) return;

    if (scanType === "LOCATION") {
      // 1. 지번 검증
      if (barcode !== currentItem.locationCode) {
        toast({
          title: "지번 불일치",
          description: "지번을 다시 확인해주십시오.",
          variant: "destructive",
        });
        return;
      }

      // 2. 검증 성공 시 API 호출
      try {
        setScannerOpen(false); // 성공했으므로 닫음
        const res = await taskService.scanLocation(task.batchTaskId, barcode);
        if (res.success) {
          setNextAction(res.data.nextAction);
          toast({ title: "지번 확인됨", description: "이제 상품을 스캔하세요." });
        } else if (res.errorCode) {
          const msg = TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode] || res.message;
          toast({ title: "지번 확인 실패", description: msg, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "지번 확인 실패", description: err.message, variant: "destructive" });
      }
    } else {
      // 1. 상품 바코드 검증
      if (barcode !== currentItem.barcode) {
        toast({
          title: "상품 불일치",
          description: "상품을 다시 확인해주십시오.",
          variant: "destructive",
        });
        return;
      }

      // 2. 검증 성공 시 API 호출
      try {
        setScannerOpen(false);
        const res = await taskService.scanItem(task.batchTaskId, barcode);
        if (res.success) {
          setNextAction(res.data.nextAction);
          const updatedItems = items.map((it) =>
            it.batchTaskItemId === res.data.payload.batchTaskItemId ? res.data.payload : it
          );
          setItems(updatedItems);
          toast({ title: "상품 인식됨", description: "수량을 확인해주세요." });
        } else if (res.errorCode) {
          const msg = TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode] || res.message;
          toast({ title: "상품 인식 실패", description: msg, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "상품 인식 실패", description: err.message, variant: "destructive" });
      }
    }
  }, [currentItem, scanType, task, items, toast]);

  if (!task || !toteBarcode || loading) return null;

  const handleQuantityChange = async (increment: number) => {
    if (!currentItem) return;
    try {
      const res = await taskService.updateQuantity(currentItem.batchTaskItemId, increment);
      if (res.success) {
        const updatedItems = items.map((it) =>
          it.batchTaskItemId === res.data.payload.batchTaskItemId ? res.data.payload : it
        );
        setItems(updatedItems);
      } else if (res.errorCode) {
        const msg = TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode] || res.message;
        toast({ title: "수량 조절 실패", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "수량 조절 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleNextWork = async () => {
    // 상품 스캔/수량이 완료되지 않은 경우 중단
    if (currentItem.status !== "DONE") {
      toast({ title: "작업 미완료", description: "현재 상품의 수량을 모두 채워주세요." });
      return;
    }

    if (currentIndex === items.length - 1) {
      // 모든 아이템이 완료되었는지 최종 확인
      const allDone = items.every((it) => it.status === "DONE");
      if (!allDone) {
        toast({
          title: "작업 미완료",
          description: "아직 처리하지 않은 상품이 있습니다. 목록을 확인해주세요.",
          variant: "destructive",
        });
        return;
      }

      // 마지막 상품인 경우 태스크 완료 처리
      try {
        const res = await taskService.completeTask(task.batchTaskId);
        if (res.success) {
          alert("축하합니다! 모든 배정 작업을 완료했습니다.");
          navigate("/worker/home");
        } else if (res.errorCode) {
          const msg = TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode] || res.message;
          toast({ title: "작업 완료 처리 실패", description: msg, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "작업 완료 처리 실패", description: err.message, variant: "destructive" });
      }
    } else {
      // 다음 상품으로 이동
      nextItemIdx();
      setNextAction("SCAN_LOCATION"); // 다음 상품은 지번 스캔부터 시작
    }
  };
  const handleIssueSelect = (type: IssueType) => {
    if (type === "DAMAGED") {
      setIssueOpen(false);
      navigate("/worker/issue/report", {
        state: { issueType: type, toteBarcode, product: currentItem },
      });
      return;
    }
    if (type === "MISSING") {
      setIssueOpen(false);
      navigate("/worker/issue/stock-analysis", {
        state: { task, toteBarcode, product: currentItem },
      });
      return;
    }
    if (type === "OTHER") {
      setIssueOpen(false);
      navigate("/worker/issue/other", {
        state: { task, toteBarcode, product: currentItem },
      });
      return;
    }
    setIssueOpen(false);
  };

  return (
    <>
      <div className="space-y-4 px-2 relative">
        {/* Navigation to List (Hamburger Icon from Screenshot) */}
        <div className="flex justify-start">
          <button
            onClick={() => navigate("/worker/task/list", { state: { task, toteBarcode } })}
            className="p-2 -mt-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex flex-col gap-1 w-6">
              <div className="h-0.5 w-full bg-gray-500 rounded-full" />
              <div className="h-0.5 w-4/5 bg-gray-500 rounded-full" />
            </div>
          </button>
        </div>

        {/* Tote Info Banner */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-base font-bold text-gray-900">토트 스캔 완료</p>
          <p className="mt-1 text-sm text-gray-400">
            토트 바코드: <span className="text-gray-600 font-medium">{toteBarcode}</span>
          </p>
        </section>

        {/* Main Work Card */}
        <section className="rounded-[32px] border border-gray-50 bg-white p-6 shadow-sm relative overflow-hidden">
          <p className="text-[22px] font-black text-center text-gray-900 leading-tight">
            {nextAction === "SCAN_LOCATION"
              ? "지번을 스캔해주세요."
              : "상품을 스캔해주세요."}
          </p>

          {/* Product Detail Area */}
          <div className="mt-8 flex items-center gap-2">
            <button
              onClick={prevItem}
              disabled={currentIndex === 0}
              className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-0 transition-opacity"
            >
              <ChevronLeft className="w-8 h-8 text-gray-300" />
            </button>

            <div className="flex-1 flex gap-5 items-center">
              <div className="h-32 w-32 rounded-3xl bg-gray-50 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-400">상품명</p>
                <p className="text-lg font-black text-gray-900 break-keep leading-snug">
                  {currentItem?.productName}
                </p>

                <p className="mt-3 text-[13px] font-semibold text-gray-400">상품 코드</p>
                <p className="text-[15px] font-bold text-gray-900 tabular-nums">
                  {currentItem?.barcode}
                </p>
              </div>
            </div>

            <button
              onClick={nextItemIdx}
              disabled={currentIndex === items.length - 1}
              className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-0 transition-opacity"
            >
              <ChevronRight className="w-8 h-8 text-gray-300" />
            </button>
          </div>

          {/* Action Status Blocks */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {/* Location Box */}
            <button
              onClick={openLocationScanner}
              disabled={nextAction !== "SCAN_LOCATION"}
              className={`flex flex-col items-center justify-center h-32 rounded-[28px] border-2 transition-all duration-300 ${nextAction === "SCAN_LOCATION"
                ? "bg-blue-50/50 border-blue-100 shadow-sm"
                : "bg-white border-transparent"
                }`}
            >
              <div className={`p-2 rounded-full mb-2 ${nextAction === "SCAN_LOCATION" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <p className={`text-sm font-bold ${nextAction === "SCAN_LOCATION" ? "text-gray-900" : "text-gray-400"}`}>지번 스캔</p>
              <p className="text-sm font-medium text-gray-500 mt-0.5">{currentItem?.locationCode}</p>
            </button>

            {/* Item Box */}
            <button
              onClick={openItemScanner}
              disabled={nextAction !== "SCAN_ITEM"}
              className={`flex flex-col items-center justify-center h-32 rounded-[28px] border-2 transition-all duration-300 ${nextAction === "SCAN_ITEM"
                ? "bg-blue-50/50 border-blue-100 shadow-sm"
                : "bg-white border-transparent"
                }`}
            >
              <div className={`p-2 rounded-full mb-2 ${nextAction === "SCAN_ITEM" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                <PackageSearch className="w-5 h-5" />
              </div>
              <p className={`text-sm font-bold ${nextAction === "SCAN_ITEM" ? "text-gray-900" : "text-gray-400"}`}>상품 스캔</p>
              <p className="text-sm font-medium text-gray-500 mt-0.5">{currentItem?.barcode}</p>
            </button>
          </div>

          {/* Manual Quantity Control */}
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-8">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={!currentItem || currentItem.pickedQty === 0}
                className={`p-3 rounded-full transition-colors ${!currentItem || currentItem.pickedQty === 0
                  ? "bg-gray-50 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 mb-1">담긴 수량 / 담아야 할 총 수량</p>
                <p className="text-2xl font-black text-gray-900">
                  <span className="text-blue-600">{currentItem?.pickedQty}</span> / {currentItem?.requiredQty}
                </p>
              </div>

              <button
                onClick={() => handleQuantityChange(1)}
                disabled={!currentItem || currentItem.pickedQty === 0}
                className={`p-3 rounded-full transition-colors ${!currentItem || currentItem.pickedQty === 0
                  ? "bg-gray-50 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Pagination Indicators */}
          <div className="flex justify-center mt-10 gap-2">
            {items.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? "w-6 bg-blue-600" : "w-2 bg-gray-200"
                  }`}
              />
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="mt-10 space-y-3">
            <button
              type="button"
              onClick={() => setIssueOpen(true)}
              className="w-full h-16 rounded-[20px] bg-[#FFE162] text-[17px] font-black text-gray-900 shadow-sm active:scale-[0.98] transition-all"
            >
              이슈 발생 신고
            </button>

            <button
              type="button"
              onClick={handleNextWork}
              className="w-full h-16 rounded-[20px] bg-blue-600 text-[17px] font-black text-white shadow-lg active:scale-[0.98] transition-all"
            >
              {currentIndex === items.length - 1 ? "작업 완료" : "다음 작업 진행"}
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

      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanned}
        title={scanType === "LOCATION" ? "지번 스캔" : "상품 바코드 스캔"}
        expectedValue={scanType === "LOCATION" ? currentItem?.locationCode : currentItem?.barcode}
      />
    </>
  );
}
