import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import IssueSelectSheet, { type IssueType } from "./IssueSelectDrawer";
import ScannerModal from "./ScannerModal";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, PackageSearch, Plus, Minus, Check, AlignJustify, Megaphone, ChevronRight } from "lucide-react";
import { taskService } from "@/services/taskService";
import type { TaskVO, TaskItemVO, NextAction } from "@/types/task";

export default function WorkDetail() {
  const { setTitle, setHeaderRight, setHeaderCenter } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useToast();

  const [currentTask, setCurrentTask] = useState<TaskVO | undefined>(state?.task);
  const [toteBarcode, setToteBarcode] = useState<string | undefined>(state?.toteBarcode);

  const [nextAction, setNextAction] = useState<NextAction>(state?.nextAction || "SCAN_LOCATION");
  const [items, setItems] = useState<TaskItemVO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [issueOpen, setIssueOpen] = useState(false);
  const sendingIssue: IssueType | null = null;

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanType, setScanType] = useState<"LOCATION" | "ITEM">("LOCATION");

  // ✅ 첫 로드(Hydration) 시 초기 상태 오버라이드 방지용 플래그
  const processedHydrationRef = useRef(false);
  // ✅ 이전 인덱스 추적 (아이템 변경 감지용)
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  // ✅ 헤더 비우기 (중앙 버튼 제거)
  useEffect(() => {
    return () => {
      setHeaderCenter(null);
      setHeaderRight(null);
    };
  }, [setHeaderCenter, setHeaderRight]);

  // ✅ 방어로직: 데이터가 없으면 홈으로 보냄 (단, 로딩 중에는 대기)
  // ✅ 방어로직: 데이터가 없으면 홈으로 보냄 (단, 로딩 중에는 대기)
  // [Fix] 토트 스캔 전(SCAN_TOTE) 상태면 튕기지 않음 (아래에서 리다이렉트 처리)
  useEffect(() => {
    if (!loading) {
      if (!currentTask) {
        console.log("🚫 No task found - redirecting to home");
        navigate("/worker/home", { replace: true });
        return;
      }

      // 토트 바코드가 없는데 스캔 단계도 아니면 문제 있음
      if (!toteBarcode && nextAction !== "SCAN_TOTE") {
        console.log("🚫 Missing toteBarcode - redirecting to home");
        navigate("/worker/home", { replace: true });
      }
    }
  }, [currentTask, toteBarcode, navigate, loading, nextAction]);

  // ✅ SCAN_TOTE 상태 감지 시 토트 스캔 화면으로 이동
  useEffect(() => {
    if (!loading && nextAction === "SCAN_TOTE") {
      console.log("🔄 Action is SCAN_TOTE, redirecting to scan page");
      // state에 task 정보 넘겨주어 재조회 방지
      navigate("/worker/task/scan", { replace: true, state: { task: currentTask } });
    }
  }, [nextAction, loading, navigate, currentTask]);

  useEffect(() => {
    const fetchEverything = async () => {
      setLoading(true);
      try {
        let taskIdToUse = currentTask?.batchTaskId || state?.task?.batchTaskId;

        // 1) 전체 타스크 상태 동기화 (새로고침 대응)
        const taskRes = await taskService.getMyActiveTask();
        if (taskRes.success && taskRes.data) {
          const fetchedTask = taskRes.data.payload as any;
          setCurrentTask(fetchedTask);
          setNextAction(taskRes.data.nextAction as NextAction);
          // toteBarcode 복구
          const recoveredTote = (taskRes.data as any).toteBarcode || (fetchedTask as any).toteBarcode;
          if (recoveredTote) setToteBarcode(recoveredTote);

          taskIdToUse = fetchedTask.batchTaskId;
          processedHydrationRef.current = true;
          console.log("🌊 Hydration complete:", { nextAction: taskRes.data.nextAction, taskId: taskIdToUse });
        }

        // 2) 아이템 목록 조회
        if (!taskIdToUse) {
          console.warn("⚠️ Task ID missing");
          return;
        }

        const response = await taskService.getTaskItems(taskIdToUse);
        if (response.success && Array.isArray(response.data)) {
          setItems(response.data);

          // ✅ 3) 복구 우선순위: 1순위(내비게이션 state), 2순위(서버 nextItem), 3순위(첫 미완료 건)
          let targetIdx = -1;
          const srvNextItem = taskRes.data.nextItem as any;

          if (state?.currentIndex !== undefined) {
            targetIdx = Number(state.currentIndex);
            console.log("📍 [WorkDetail] 내비게이션 상태에서 인덱스 복구:", targetIdx);
          } else if (srvNextItem?.batchTaskItemId) {
            targetIdx = response.data.findIndex((it) => it.batchTaskItemId === srvNextItem.batchTaskItemId);
          }

          if (targetIdx === -1) {
            // 아직 처리되지 않은 첫 번째 아이템 찾기
            targetIdx = response.data.findIndex((it) => it.status !== "DONE" && it.status !== "ISSUE");
          }

          if (targetIdx !== -1) {
            if (currentIndex !== targetIdx) {
              setCurrentIndex(targetIdx);
              prevIndexRef.current = targetIdx; // ✅ 복구 시점에는 변경으로 간주하지 않도록 즉시 동기화
              console.log("📍 세션 복구: 현재 인덱스 설정 ->", targetIdx);
            }
          }
          // ✅ 모든 인덱스/상태 복구가 끝난 것이 확실할 때 플래그 설정
          processedHydrationRef.current = true;
          console.log("🌊 Hydration & Index restoration final complete.");
        }
      } catch (err: any) {
        console.error("Fetch data error:", err);
        toast({ title: "데이터 조회 실패", description: err?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentItem = items[currentIndex];

  // ✅ 각 아이템별 워크플로우 상태 추적 (itemId -> NextAction)
  const itemStatesRef = useRef<Map<number, NextAction>>(new Map());

  // ✅ 현재 아이템이 바뀔 때 nextAction 저장/복원
  useEffect(() => {
    if (!items[currentIndex]) return;
    if (loading) return;

    const item = items[currentIndex];
    const itemId = item.batchTaskItemId;
    const indexChanged = prevIndexRef.current !== currentIndex;
    prevIndexRef.current = currentIndex;

    console.log("🔄 useEffect: Syncing item state", {
      itemId,
      status: item.status,
      indexChanged,
      isHydrated: processedHydrationRef.current,
      currentAction: nextAction
    });

    // ✅ 1) 아이템 완료/이슈 상태면 다음 단계로 강제 설정
    if (item.status === "DONE" || item.status === "ISSUE" || item.status === "ISSUE_PENDING") {
      setNextAction("NEXT_ITEM");
      return;
    }

    // ✅ 2) 첫 진입(Hydration) 직후라면 서버가 준 nextAction 유지
    if (!processedHydrationRef.current) {
      console.log("🌊 Maintaining server-provided action during hydration:", nextAction);
      prevIndexRef.current = currentIndex; // 복구 중 상태 동기화
      return;
    }

    // ✅ 3) 그 외 사용자가 직접 아이템을 바꿨으면 무조건 지번 스캔부터 시작 (보안/정확도)
    if (indexChanged) {
      console.log("🔄 Manual index change detected, resetting to SCAN_LOCATION");
      setNextAction("SCAN_LOCATION");
      return;
    }
  }, [currentIndex, items, loading]);

  // ✅ nextAction이 바뀔 때 현재 아이템 상태 저장
  useEffect(() => {
    const item = items[currentIndex];
    if (item && item.status !== "DONE" && nextAction !== "NEXT_ITEM") {
      itemStatesRef.current.set(item.batchTaskItemId, nextAction);
    }
  }, [nextAction, currentIndex, items]);

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
      console.log("🚀 scanLocation body =", { locationCode: barcode });

      if (!currentItem || !currentTask) return;

      if (scanType === "LOCATION") {
        if (barcode !== currentItem.locationCode) {
          toast({ title: "지번 불일치", description: "지번을 다시 확인해주십시오.", variant: "destructive" });
          return;
        }
        try {
          setScannerOpen(false);
          const res = await taskService.scanLocation(currentTask.batchTaskId, barcode);
          if (res.success && res.data) {
            itemStatesRef.current.set(currentItem.batchTaskItemId, res.data.nextAction);
            setNextAction(res.data.nextAction);
            if (res.data.payload) {
              setCurrentTask(res.data.payload as any);
            }
            toast({ title: "지번 확인됨" });
          } else {
            toast({ title: "지번 확인 실패", variant: "destructive" });
          }
        } catch (err: any) {
          // ✅ 409 Conflict: 이미 지번이 확인된 경우 (서버 상태와 UI 불일치 시 발생 가능)
          if (err?.response?.status === 409) {
            console.warn("⚠️ Location already confirmed (409). Fetching current state...");
            const activeRes = await taskService.getMyActiveTask();
            if (activeRes.success && activeRes.data) {
              setNextAction(activeRes.data.nextAction as NextAction);
              toast({ title: "이미 확인된 지번입니다." });
              return;
            }
          }
          toast({ title: "오류", description: err?.message, variant: "destructive" });
        }
        return;
      }

      // ITEM
      if (barcode !== currentItem.barcode) {
        toast({ title: "상품 불일치", variant: "destructive" });
        return;
      }
      try {
        setScannerOpen(false);
        const res = await taskService.scanItem(currentTask.batchTaskId, barcode);
        if (res.success && res.data) {
          itemStatesRef.current.set(currentItem.batchTaskItemId, res.data.nextAction);
          setNextAction(res.data.nextAction);
          const updatedPayload = res.data.payload;
          setItems(itms => itms.map((it) => it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it));
          toast({ title: "상품 인식됨" });
        } else {
          toast({ title: "상품 인식 실패", variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "오류", description: err?.message, variant: "destructive" });
      }
    },
    [currentItem, currentTask, scanType, toast]
  );

  const handleQuantityChange = async (increment: number) => {
    if (!currentItem) return;
    try {
      const res = await taskService.updateQuantity(currentItem.batchTaskItemId, increment);
      if (res.success && res.data) {
        const updatedPayload = res.data.payload;
        setItems(itms => itms.map((it) => it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it));
      }
    } catch (err: any) {
      toast({ title: "실패", description: err?.message, variant: "destructive" });
    }
  };

  const handleNextWork = async () => {
    if (!currentItem || !currentTask) return;
    // [Fix] ISSUE_PENDING(보류) 상태도 ISSUE 완료 상태와 마찬가지로 수량 체크 건너뜀
    if (currentItem.pickedQty < currentItem.requiredQty &&
      currentItem.status !== "ISSUE" &&
      currentItem.status !== "ISSUE_PENDING") {
      toast({ title: "작업 미완료", description: "수량을 모두 채워주세요." });
      return;
    }

    try {
      const completeRes = await taskService.completeItem(currentItem.batchTaskItemId);
      if (!completeRes.success) {
        toast({ title: "처리 실패", variant: "destructive" });
        return;
      }

      const nextActionFromServer = completeRes.data?.nextAction;
      if (nextActionFromServer === "COMPLETE_TASK") {
        const completeTaskRes = await taskService.completeTask(currentTask.batchTaskId);
        if (completeTaskRes.success) {
          alert("모든 작업을 완료했습니다!");
          navigate("/worker/home");
        }
        return;
      }

      if (nextActionFromServer) {
        setNextAction(nextActionFromServer as NextAction);
      }

      const updatedPayload = completeRes.data?.payload;
      if (updatedPayload) {
        setItems(itms => itms.map((it) => it.batchTaskItemId === updatedPayload.batchTaskItemId ? updatedPayload : it));
      }

      // [Fix] 백엔드가 지정한 다음 아이템(nextItem)으로 이동하도록 수정 (건너뛰기/복구 대응)
      // 기존: setCurrentIndex((i) => i + 1); -> 순차 이동만 가능하여 마지막 아이템 처리 후 문제 발생
      const nextItemFromServer = completeRes.data?.nextItem;
      if (nextItemFromServer) {
        const nextIndex = items.findIndex(it => it.batchTaskItemId === nextItemFromServer.batchTaskItemId);
        if (nextIndex !== -1) {
          if (nextIndex < currentIndex) {
            toast({ title: "알림", description: "미완료된 이전 작업 항목으로 이동합니다." });
          }
          setCurrentIndex(nextIndex);
          return;
        }
      }

      // nextItem이 없거나 못 찾은 경우 (예: 순차 진행)
      if (currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // 더 이상 갈 곳이 없는데 COMPLETE_TASK도 아닌 경우 (예외 상황)
        console.warn("No next item found but task not completed.");
      }
      setNextAction(nextActionFromServer || "SCAN_LOCATION");
    } catch (err: any) {
      toast({ title: "오류", description: err?.message, variant: "destructive" });
    }
  };

  const handleIssueSelect = (type: IssueType) => {
    if (!currentItem || !currentTask) return;

    // ✅ 튕김 방지: 세션 유지용 데이터 저장 (fallback)
    const issueState = {
      issueType: type,
      toteBarcode,
      product: {
        productName: currentItem.productName,
        barcode: currentItem.barcode,
        locationCode: currentItem.locationCode,
        batchTaskId: currentTask.batchTaskId,
        batchTaskItemId: currentItem.batchTaskItemId,
      },
      currentIndex,
    };
    localStorage.setItem("latest_issue_state", JSON.stringify(issueState));

    if (type === "DAMAGED") {
      setIssueOpen(false);
      navigate("/worker/issue/report", { state: issueState });
    } else if (type === "OUT_OF_STOCK") {
      setIssueOpen(false);
      navigate("/worker/issue/stock-analysis", { state: { ...issueState, task: currentTask } });
    } else {
      setIssueOpen(false);
    }
  };

  const isQuantityControlEnabled = nextAction !== "SCAN_LOCATION" && nextAction !== "SCAN_ITEM" && nextAction !== "NONE";

  // ✅ UI 상태 판정: 현재 단계(nextAction)가 해당 단계를 확실히 지났을 때만 확인됨(초록색) 처리
  const isLocationConfirmed =
    nextAction !== "SCAN_LOCATION" && ["SCAN_ITEM", "ADJUST_QUANTITY", "NEXT_ITEM"].includes(nextAction);

  const isItemConfirmed =
    nextAction !== "SCAN_ITEM" && nextAction !== "SCAN_LOCATION" && ["ADJUST_QUANTITY", "NEXT_ITEM"].includes(nextAction);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-gray-500 text-lg">작업 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!currentTask || !toteBarcode || !currentItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="p-4 bg-gray-50 rounded-full">
          <AlignJustify className="w-12 h-12 text-gray-300" />
        </div>
        <div>
          <p className="text-xl font-black text-gray-900">작업 정보가 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400 font-medium leading-relaxed">진행 중인 작업 세션이 만료되었거나<br />할당된 아이템이 없습니다.</p>
        </div>
        <button onClick={() => navigate("/worker/home")} className="w-full max-w-[200px] h-14 bg-blue-600 text-white rounded-[20px] font-black text-base shadow-lg active:scale-95 transition-all">
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 px-2 relative h-full flex flex-col">
        {/* 상단 카드: 토트 정보 및 상품 목록 */}
        <section className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm flex justify-between items-center group active:scale-[0.99] transition-all">
          <div
            onClick={() => navigate("/worker/task/list", { state: { task: currentTask, toteBarcode } })}
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-gray-900">상품 목록</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
              토트 바코드: <span className="text-blue-600/80">{toteBarcode}</span>
            </p>
          </div>

          <motion.button
            whileHover={nextAction !== "SCAN_LOCATION" ? { scale: 1.02 } : {}}
            whileTap={nextAction !== "SCAN_LOCATION" ? { scale: 0.96 } : {}}
            onClick={() => {
              if (nextAction === "SCAN_LOCATION") {
                toast({ title: "지번 스캔 필요", description: "위치 확인 후 신고 가능합니다." });
                return;
              }
              setIssueOpen(true);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border transition-all ${nextAction === "SCAN_LOCATION"
              ? "bg-gray-50 text-gray-300 border-gray-100 opacity-60"
              : "bg-[#FFE162] text-[#854D0E] border-[#FDE047] shadow-sm font-black text-sm"
              }`}
          >
            <Megaphone className={`w-3.5 h-3.5 ${nextAction === "SCAN_LOCATION" ? "opacity-30" : ""}`} />
            <span>이슈 신고</span>
          </motion.button>
        </section>

        {/* 메인 작업 카드 */}
        <section className="flex-1 rounded-[28px] border border-gray-50 bg-white p-4 shadow-sm relative overflow-hidden flex flex-col">
          <div className="mt-12 mb-4 flex justify-center">
            <p className="text-[22px] font-black text-center text-gray-900 leading-tight">
              {nextAction === "SCAN_LOCATION" ? "지번을 스캔해주세요." :
                nextAction === "SCAN_ITEM" ? "상품을 스캔해주세요." : "수량을 확인해주세요."}
            </p>
          </div>

          <div className="mt-8 flex items-center px-4">
            <div className="flex-1 flex gap-5 items-center">
              <div className="h-28 w-28 rounded-2xl bg-gray-100 flex-shrink-0 animate-pulse border border-gray-100 shadow-inner" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">상품 정보</p>
                <p className="text-xl font-black text-gray-900 break-keep leading-tight line-clamp-2 mt-1">
                  {currentItem.productName}
                </p>
                <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">상품 코드</p>
                <p className="text-[17px] font-black text-blue-600 tabular-nums">{currentItem.barcode}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {(() => {
              return (
                <>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={openLocationScanner}
                    disabled={nextAction !== "SCAN_LOCATION"}
                    className={`flex flex-col items-center justify-center h-28 rounded-[32px] border-2 transition-all duration-300 ${nextAction === "SCAN_LOCATION"
                      ? "bg-blue-50/60 border-blue-600 shadow-[0_12px_24px_-8px_rgba(37,99,235,0.3)] ring-4 ring-blue-600/5"
                      : isLocationConfirmed
                        ? "bg-emerald-50/50 border-emerald-500"
                        : "bg-slate-50 border-transparent text-slate-300 opacity-60"
                      }`}
                  >
                    <div className={`p-3 rounded-2xl mb-2 transition-all ${nextAction === "SCAN_LOCATION" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isLocationConfirmed ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-200 text-slate-400"}`}>
                      {nextAction === "SCAN_LOCATION" ? <MapPin className="w-4 h-4" strokeWidth={2.8} /> : isLocationConfirmed ? <Check className="w-4 h-4" strokeWidth={4} /> : <MapPin className="w-4 h-4" strokeWidth={2.5} />}
                    </div>
                    <p className={`text-[13px] font-black tracking-tight ${nextAction === "SCAN_LOCATION" ? "text-slate-900" : isLocationConfirmed ? "text-emerald-700" : "text-slate-400"}`}>
                      {nextAction === "SCAN_LOCATION" ? "지번 스캔" : isLocationConfirmed ? "지번 확인됨" : "지번 대기"}
                    </p>
                    <p className={`text-[12px] font-bold mt-0.5 tracking-tight ${nextAction === "SCAN_LOCATION" ? "text-blue-600" : "text-slate-400"}`}>{currentItem.locationCode}</p>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={openItemScanner}
                    disabled={nextAction !== "SCAN_ITEM"}
                    className={`flex flex-col items-center justify-center h-28 rounded-[32px] border-2 transition-all duration-300 ${nextAction === "SCAN_ITEM"
                      ? "bg-blue-50/60 border-blue-600 shadow-[0_12px_24px_-8px_rgba(37,99,235,0.3)] ring-4 ring-blue-600/5"
                      : isItemConfirmed
                        ? "bg-emerald-50/50 border-emerald-500"
                        : "bg-slate-50 border-transparent text-slate-300 opacity-60"
                      }`}
                  >
                    <div className={`p-3 rounded-2xl mb-2 transition-all ${nextAction === "SCAN_ITEM" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isItemConfirmed ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-200 text-slate-400"}`}>
                      {nextAction === "SCAN_ITEM" ? <PackageSearch className="w-4 h-4" strokeWidth={2.5} /> : isItemConfirmed ? <Check className="w-4 h-4" strokeWidth={4} /> : <PackageSearch className="w-4 h-4" strokeWidth={2.2} />}
                    </div>
                    <p className={`text-[13px] font-black tracking-tight ${nextAction === "SCAN_ITEM" ? "text-slate-900" : isItemConfirmed ? "text-emerald-700" : "text-slate-400"}`}>
                      {nextAction === "SCAN_ITEM" ? "상품 스캔" : isItemConfirmed ? "상품 확인됨" : "상품 대기"}
                    </p>
                    <p className={`text-[12px] font-bold mt-0.5 tracking-tight ${nextAction === "SCAN_ITEM" ? "text-blue-600" : "text-slate-400"}`}>{currentItem.barcode}</p>
                  </motion.button>
                </>
              );
            })()}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-3xl border border-gray-100/50">
            <div className="flex items-center gap-10">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={!isQuantityControlEnabled || currentItem.pickedQty === 0}
                className={`p-3.5 rounded-full shadow-sm transition-all active:scale-90 ${!isQuantityControlEnabled || currentItem.pickedQty === 0 ? "bg-gray-100 text-gray-300" : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-100"}`}
              >
                <Minus className="w-5 h-5" strokeWidth={3} />
              </button>

              <div className="text-center min-w-[100px]">
                <p className="text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">담은 수량</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[32px] font-black text-blue-600 tabular-nums">{currentItem.pickedQty}</span>
                  <span className="text-lg font-bold text-gray-300">/</span>
                  <span className="text-lg font-black text-gray-400 tabular-nums">{currentItem.requiredQty}</span>
                </div>
              </div>

              <button
                onClick={() => handleQuantityChange(1)}
                disabled={!isQuantityControlEnabled || currentItem.pickedQty >= currentItem.requiredQty}
                className={`p-3.5 rounded-full shadow-sm transition-all active:scale-90 ${!isQuantityControlEnabled || currentItem.pickedQty >= currentItem.requiredQty ? "bg-gray-100 text-gray-300" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="mt-10 mb-4 flex flex-col gap-6">
            <div className="flex justify-center gap-2">
              {items.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? "w-6 bg-blue-600" : "w-1.5 bg-gray-200"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleNextWork}
              className="w-full h-16 rounded-[22px] bg-blue-600 text-[18px] font-black text-white shadow-lg active:scale-[0.98] transition-all"
            >
              {currentIndex === items.length - 1 ? "모든 작업 완료" : "다음 작업 진행"}
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
        expectedValue={scanType === "LOCATION" ? currentItem.locationCode : currentItem.barcode}
      />
    </>
  );
}
