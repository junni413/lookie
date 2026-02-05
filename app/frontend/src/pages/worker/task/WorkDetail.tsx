import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import IssueSelectSheet, { type IssueType } from "./IssueSelectDrawer";
import ScannerModal from "./ScannerModal";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, MapPin, PackageSearch, Plus, Minus, Check } from "lucide-react";
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

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanType, setScanType] = useState<"LOCATION" | "ITEM">("LOCATION");

  // initializedItemsRef는 아래 currentItem 선언 이후에 정의됨

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  // ✅ 가장 먼저 방어: task/toteBarcode 없으면 화면 진입 자체를 막음
  useEffect(() => {
    if (!task || !toteBarcode) {
      navigate("/worker/home", { replace: true });
    }
  }, [task, toteBarcode, navigate]);

  // ✅ 방어 후, TS가 확정할 수 있게 safeTask로 고정
  if (!task || !toteBarcode) return null;
  const safeTask = task; // 이제부터 safeTask는 TaskVO로 확정

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // ✅ GET /api/tasks/{taskId}/items -> ApiResponse<List<TaskItemVO>>
        const response = await taskService.getTaskItems(safeTask.batchTaskId);

        console.log("📦 Fetched items:", response.data?.length ?? 0);

        if (response.success && Array.isArray(response.data)) {
          setItems(response.data);
          setCurrentIndex(0);
          // initializedItemsRef는 아래에서 관리됨
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error("Fetch items error:", err);
        setItems([]);
        toast({ title: "아이템 조회 실패", description: err?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTask.batchTaskId]); // toast 제거 - 불필요한 재실행 방지

  const currentItem = items[currentIndex];

  // ✅ 각 아이템별 워크플로우 상태 추적 (itemId -> NextAction)
  const itemStatesRef = useRef<Map<number, NextAction>>(new Map());

  // ✅ 현재 아이템이 바뀔 때 nextAction 저장/복원
  useEffect(() => {
    if (!items[currentIndex]) return;

    const item = items[currentIndex];
    const itemId = item.batchTaskItemId;

    console.log("🔄 useEffect triggered:", {
      currentIndex,
      itemId,
      itemStatus: item.status,
      pickedQty: item.pickedQty,
      savedState: itemStatesRef.current.get(itemId)
    });

    // ✅ 이미 완료된 아이템(DONE)은 완료 상태로 표시
    if (item.status === "DONE") {
      console.log("🔄 Item is DONE - showing as complete");
      setNextAction("NEXT_ITEM");
      return;
    }

    // ✅ 저장된 상태가 있으면 복원
    const savedState = itemStatesRef.current.get(itemId);
    if (savedState) {
      console.log("🔄 Restoring saved state:", savedState);
      setNextAction(savedState);
      return;
    }

    // ✅ 처음 방문하는 아이템은 SCAN_LOCATION으로 시작
    console.log("🔄 First visit - initializing to SCAN_LOCATION");
    itemStatesRef.current.set(itemId, "SCAN_LOCATION");
    setNextAction("SCAN_LOCATION");
  }, [currentIndex, items]);

  // ✅ nextAction이 바뀔 때 현재 아이템 상태 저장
  useEffect(() => {
    const item = items[currentIndex];
    if (item && item.status !== "DONE" && nextAction !== "NEXT_ITEM") {
      console.log("� Saving state for item", item.batchTaskItemId, ":", nextAction);
      itemStatesRef.current.set(item.batchTaskItemId, nextAction);
    }
  }, [nextAction, currentIndex, items]);

  // ✅ 이전 아이템으로 이동 (단순 네비게이션, 완료된 아이템은 이미 DONE 상태)
  const handlePrevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // ✅ 다음 아이템으로 이동 (수량 채워졌으면 completeItem 호출 후 이동)
  const handleNextItem = async () => {
    if (currentIndex >= items.length - 1) return;

    const item = items[currentIndex];

    // 수량이 다 채워졌고 아직 DONE이 아니면 completeItem 호출
    if (item && item.pickedQty >= item.requiredQty && item.status !== "DONE") {
      console.log("➡️ Completing item before moving to next:", item.batchTaskItemId);

      try {
        const res = await taskService.completeItem(item.batchTaskItemId);

        if (res.success && res.data) {
          console.log("➡️ Item completed, nextAction:", res.data.nextAction);

          // 아이템 상태 업데이트
          const updatedPayload = res.data.payload;
          if (updatedPayload) {
            const updatedItems = items.map((it) =>
              it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it
            );
            setItems(updatedItems);
          }

          // 다음 아이템으로 이동
          setCurrentIndex((i) => i + 1);
          setNextAction(res.data.nextAction || "SCAN_LOCATION");
        } else {
          console.error("➡️ completeItem failed:", res.message);
          toast({ title: "완료 처리 실패", description: res.message, variant: "destructive" });
        }
      } catch (err: any) {
        console.error("➡️ completeItem error:", err);
        toast({ title: "완료 처리 실패", description: err?.message, variant: "destructive" });
      }
    } else {
      // 수량 안 채워졌으면 그냥 이동 (또는 이미 DONE)
      setCurrentIndex((i) => i + 1);
    }
  };

  const openLocationScanner = () => {
    setScanType("LOCATION");
    setScannerOpen(true);
  };

  const openItemScanner = () => {
    setScanType("ITEM");
    setScannerOpen(true);
  };

  const handleScanned = useCallback(
    async (barcode: string) => {
      if (!currentItem) return;

      if (scanType === "LOCATION") {
        // 1) 프론트 1차 검증
        if (barcode !== currentItem.locationCode) {
          toast({ title: "지번 불일치", description: "지번을 다시 확인해주십시오.", variant: "destructive" });
          return;
        }

        // 2) 백 호출: POST /api/tasks/{taskId}/locations/check
        try {
          setScannerOpen(false);
          const res = await taskService.scanLocation(safeTask.batchTaskId, barcode);

          // ✅ 디버깅: 백엔드 응답 확인
          console.log("📍 Location Scan Response:", JSON.stringify(res, null, 2));

          if (res.success && res.data) {
            console.log("📍 Setting nextAction to:", res.data.nextAction);

            // ✅ Map을 먼저 업데이트하여 useEffect가 복원할 때 올바른 상태 사용
            itemStatesRef.current.set(currentItem.batchTaskItemId, res.data.nextAction);
            setNextAction(res.data.nextAction);
            toast({ title: "지번 확인됨", description: "이제 상품을 스캔하세요." });
          } else {
            const msg =
              (res.errorCode && TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode]) ||
              res.message ||
              "지번 확인에 실패했습니다.";
            toast({ title: "지번 확인 실패", description: msg, variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "지번 확인 실패", description: err?.message, variant: "destructive" });
        }
        return;
      }

      // ITEM
      // 1) 프론트 1차 검증
      if (barcode !== currentItem.barcode) {
        toast({ title: "상품 불일치", description: "상품을 다시 확인해주십시오.", variant: "destructive" });
        return;
      }

      // 2) 백 호출: POST /api/tasks/{taskId}/items/scan
      try {
        setScannerOpen(false);
        const res = await taskService.scanItem(safeTask.batchTaskId, barcode);

        // ✅ 디버깅: 백엔드 응답 확인
        console.log("📦 Item Scan Response:", JSON.stringify(res, null, 2));

        if (res.success && res.data) {
          console.log("📦 Setting nextAction to:", res.data.nextAction);

          // ✅ Map을 먼저 업데이트하여 useEffect가 복원할 때 올바른 상태 사용
          itemStatesRef.current.set(currentItem.batchTaskItemId, res.data.nextAction);
          setNextAction(res.data.nextAction);

          const updatedPayload = res.data.payload;
          const updatedItems = items.map((it) =>
            it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it
          );
          setItems(updatedItems);

          toast({ title: "상품 인식됨", description: "수량을 확인해주세요." });
        } else {
          const msg =
            (res.errorCode && TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode]) ||
            res.message ||
            "상품 인식에 실패했습니다.";
          toast({ title: "상품 인식 실패", description: msg, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "상품 인식 실패", description: err?.message, variant: "destructive" });
      }
    },
    [currentItem, scanType, safeTask.batchTaskId, items, toast]
  );

  const handleQuantityChange = async (increment: number) => {
    if (!currentItem) return;

    try {
      const res = await taskService.updateQuantity(currentItem.batchTaskItemId, increment);

      if (res.success && res.data) {
        const updatedPayload = res.data.payload;
        const updatedItems = items.map((it) =>
          it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it
        );
        setItems(updatedItems);
      } else {
        const msg =
          (res.errorCode && TASK_ERROR_MESSAGES[res.errorCode as TaskErrorCode]) ||
          res.message ||
          "수량 조절에 실패했습니다.";
        toast({ title: "수량 조절 실패", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "수량 조절 실패", description: err?.message, variant: "destructive" });
    }
  };

  const handleNextWork = async () => {
    console.log("🚀 handleNextWork called", {
      currentItem,
      pickedQty: currentItem?.pickedQty,
      requiredQty: currentItem?.requiredQty,
    });

    if (!currentItem) {
      console.log("🚀 No currentItem, returning");
      return;
    }

    // 수량이 아직 다 안 채워졌으면 막기
    if (currentItem.pickedQty < currentItem.requiredQty) {
      console.log("🚀 Quantity not met:", currentItem.pickedQty, "<", currentItem.requiredQty);
      toast({ title: "작업 미완료", description: "현재 상품의 수량을 모두 채워주세요." });
      return;
    }

    console.log("🚀 Proceeding to completeItem...");

    try {
      // ✅ 1. 현재 아이템 완료 처리 (백엔드 호출)
      const completeRes = await taskService.completeItem(currentItem.batchTaskItemId);

      if (!completeRes.success) {
        const msg =
          (completeRes.errorCode && TASK_ERROR_MESSAGES[completeRes.errorCode as TaskErrorCode]) ||
          completeRes.message ||
          "아이템 완료 처리에 실패했습니다.";
        toast({ title: "완료 처리 실패", description: msg, variant: "destructive" });
        return;
      }

      // 백엔드에서 반환된 nextAction 사용
      const nextActionFromServer = completeRes.data?.nextAction;
      console.log("📋 completeItem response:", { nextAction: nextActionFromServer });

      // ✅ 2. 마지막 아이템이고 모든 작업 완료인 경우
      if (nextActionFromServer === "COMPLETE_TASK") {
        const completeTaskRes = await taskService.completeTask(safeTask.batchTaskId);

        if (completeTaskRes.success) {
          alert("축하합니다! 모든 배정 작업을 완료했습니다.");
          navigate("/worker/home");
        } else {
          const msg =
            (completeTaskRes.errorCode && TASK_ERROR_MESSAGES[completeTaskRes.errorCode as TaskErrorCode]) ||
            completeTaskRes.message ||
            "작업 완료 처리에 실패했습니다.";
          toast({ title: "작업 완료 처리 실패", description: msg, variant: "destructive" });
        }
        return;
      }

      // ✅ 3. 다음 아이템으로 이동
      // 현재 아이템 상태 업데이트
      const updatedPayload = completeRes.data?.payload;
      if (updatedPayload) {
        const updatedItems = items.map((it) =>
          it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it
        );
        setItems(updatedItems);
      }

      // 다음 아이템으로 이동 (useEffect가 새 아이템의 상태에 따라 nextAction 설정)
      setCurrentIndex((i) => i + 1);
      setNextAction(nextActionFromServer || "SCAN_LOCATION");

    } catch (err: any) {
      toast({ title: "처리 실패", description: err?.message, variant: "destructive" });
    }
  };

  const handleIssueSelect = (type: IssueType) => {
    if (!currentItem) return;

    if (type === "DAMAGED") {
      setIssueOpen(false);
      navigate("/worker/issue/report", { state: { issueType: type, toteBarcode, product: currentItem } });
      return;
    }
    if (type === "OUT_OF_STOCK") {
      setIssueOpen(false);
      navigate("/worker/issue/stock-analysis", { state: { task: safeTask, toteBarcode, product: currentItem } });
      return;
    }
    setIssueOpen(false);
  };

  // 방어
  if (loading) return null;
  if (!currentItem) return null;

  // ✅ 수량 조절 가능 여부: 상품 스캔 후(ADJUST_QUANTITY 등)이거나 SCAN_ITEM 단계가 지나야 함
  // 간단히: nextAction이 SCAN_LOCATION이 아니고 SCAN_ITEM도 아니어야 함 (즉, 상품 스캔을 통과한 상태)
  // 혹은, 백엔드가 주는 nextAction이 ADJUST_QUANTITY 인지 확인.
  // 여기서는 "상품 스캔 전에는 비활성화" 이므로 -> nextAction === "SCAN_LOCATION" || nextAction === "SCAN_ITEM" 이면 비활성화
  const isQuantityControlEnabled =
    nextAction !== "SCAN_LOCATION" && nextAction !== "SCAN_ITEM";

  return (
    <>
      <div className="space-y-4 px-2 relative">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-base font-bold text-gray-900">토트 스캔 완료</p>
            <p className="mt-1 text-sm text-gray-400">
              토트 바코드: <span className="text-gray-600 font-medium">{toteBarcode}</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/worker/task/list", { state: { task: safeTask, toteBarcode } })}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex flex-col gap-1.5 items-end justify-center w-8">
              <div className="h-0.5 w-full bg-gray-400 rounded-full" />
              <div className="h-0.5 w-2/3 bg-gray-400 rounded-full" />
              <div className="h-0.5 w-full bg-gray-400 rounded-full" />
            </div>
          </button>
        </section>

        <section className="rounded-[32px] border border-gray-50 bg-white p-6 shadow-sm relative overflow-hidden">
          <p className="text-[22px] font-black text-center text-gray-900 leading-tight">
            {nextAction === "SCAN_LOCATION" ? "지번을 스캔해주세요." :
              nextAction === "SCAN_ITEM" ? "상품을 스캔해주세요." : "수량을 확인해주세요."}
          </p>

          <div className="mt-8 flex items-center gap-2">
            <button
              onClick={handlePrevItem}
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
                  {currentItem.productName}
                </p>

                <p className="mt-3 text-[13px] font-semibold text-gray-400">상품 코드</p>
                <p className="text-[15px] font-bold text-gray-900 tabular-nums">{currentItem.barcode}</p>
              </div>
            </div>

            <button
              onClick={handleNextItem}
              disabled={currentIndex === items.length - 1}
              className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-0 transition-opacity"
            >
              <ChevronRight className="w-8 h-8 text-gray-300" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {(() => {
              // ✅ 상태 계산을 간단하게 처리
              const isLocationActive = nextAction === "SCAN_LOCATION";
              const isLocationDone = !isLocationActive && nextAction !== "NONE";
              const isItemActive = nextAction === "SCAN_ITEM";
              const isItemDone = isQuantityControlEnabled;

              return (
                <>
                  {/* 지번 스캔 버튼 */}
                  <button
                    onClick={openLocationScanner}
                    disabled={!isLocationActive}
                    className={`flex flex-col items-center justify-center h-32 rounded-[28px] border-2 transition-all duration-300 ${isLocationActive
                      ? "bg-blue-50/50 border-blue-100 shadow-sm"
                      : isLocationDone
                        ? "bg-green-50/50 border-green-100"
                        : "bg-white border-transparent"
                      }`}
                  >
                    <div
                      className={`p-2 rounded-full mb-2 ${isLocationActive
                        ? "bg-blue-600 text-white"
                        : isLocationDone
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-400"
                        }`}
                    >
                      {isLocationDone ? <Check className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    </div>
                    <p className={`text-sm font-bold ${isLocationActive ? "text-gray-900" : isLocationDone ? "text-green-600" : "text-gray-400"
                      }`}>
                      {isLocationDone ? "지번 확인 완료" : "지번 스캔"}
                    </p>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{currentItem.locationCode}</p>
                  </button>

                  {/* 상품 스캔 버튼 */}
                  <button
                    onClick={openItemScanner}
                    disabled={!isItemActive}
                    className={`flex flex-col items-center justify-center h-32 rounded-[28px] border-2 transition-all duration-300 ${isItemActive
                      ? "bg-blue-50/50 border-blue-100 shadow-sm"
                      : isItemDone
                        ? "bg-green-50/50 border-green-100"
                        : "bg-white border-transparent"
                      }`}
                  >
                    <div
                      className={`p-2 rounded-full mb-2 ${isItemActive
                        ? "bg-blue-600 text-white"
                        : isItemDone
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-400"
                        }`}
                    >
                      {isItemDone ? <Check className="w-5 h-5" /> : <PackageSearch className="w-5 h-5" />}
                    </div>
                    <p className={`text-sm font-bold ${isItemActive ? "text-gray-900" : isItemDone ? "text-green-600" : "text-gray-400"
                      }`}>
                      {isItemDone ? "상품 확인 완료" : "상품 스캔"}
                    </p>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{currentItem.barcode}</p>
                  </button>
                </>
              );
            })()}
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-8">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={!isQuantityControlEnabled || currentItem.pickedQty === 0}
                className={`p-3 rounded-full transition-colors ${!isQuantityControlEnabled || currentItem.pickedQty === 0 ? "bg-gray-50 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 mb-1">담긴 수량 / 담아야 할 총 수량</p>
                <p className="text-2xl font-black text-gray-900">
                  <span className="text-blue-600">{currentItem.pickedQty}</span> / {currentItem.requiredQty}
                </p>
              </div>

              <button
                onClick={() => handleQuantityChange(1)}
                disabled={!isQuantityControlEnabled || currentItem.pickedQty >= currentItem.requiredQty}
                className={`p-3 rounded-full transition-colors ${!isQuantityControlEnabled || currentItem.pickedQty >= currentItem.requiredQty
                  ? "bg-gray-50 text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-10 gap-2">
            {items.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? "w-6 bg-blue-600" : "w-2 bg-gray-200"}`}
              />
            ))}
          </div>

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
      </div >

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
        expectedValue={scanType === "LOCATION" ? currentItem.locationCode : currentItem.barcode}
      />
    </>
  );
}
