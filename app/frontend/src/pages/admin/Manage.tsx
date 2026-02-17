import { useCallback, useEffect, useState } from "react";
import { useInterval } from "@/hooks/useInterval";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import { Button } from "@/components/ui/button";

import { manageService } from "@/services/manageService";
import { rebalanceService, type RebalanceMove } from "@/services/rebalance.api"; // Import Rebalance Service
import type { ZoneStat } from "@/types/db"; // Import from shared types
import type { DB_Worker } from "@/types/db";
import { applyWorkerCounts, mergeZoneData } from "@/utils/zoneUtils"; // Import shared constant
import { useZoneStats } from "@/hooks/useZoneStats";
import ManageStatisticCard from "./components/manage/ManageStatisticCard";
import ManageZoneColumn from "./components/manage/ManageZoneColumn";
import AiReallocationModal from "./components/manage/AiReallocationModal";
import { RotateCcw, Wand2, Check } from "lucide-react";


export default function Manage() {
    // Init with Defaults to prevent flash of empty content
    const { zones: stats, setZones: setStats, refreshZones } = useZoneStats({ pollingMs: 5000, autoRefresh: false });
    const [workers, setWorkers] = useState<DB_Worker[]>([]);

    // History State
    const [lastAppliedWorkers, setLastAppliedWorkers] = useState<DB_Worker[]>([]);
    const [prevAppliedWorkers, setPrevAppliedWorkers] = useState<DB_Worker[] | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [lastMovedWorkerIds, setLastMovedWorkerIds] = useState<number[]>([]);
    const [pendingAiMoves, setPendingAiMoves] = useState<RebalanceMove[] | null>(null);

    // Check if user has unsaved changes
    const isDirty = JSON.stringify(workers) !== JSON.stringify(lastAppliedWorkers);

    const displayStats: ZoneStat[] = applyWorkerCounts(stats, workers).map(stat => ({
        ...stat,
        // Zone progress stays as server-provided workload progress
        workRate: stat.workRate,
        // Status comes from server (rebalance snapshot / DB logic)
        status: stat.status,
    }));

    useEffect(() => {
        loadData();
    }, []);

    // Poll every 5 seconds, but pause if user is editing or AI modal is open
    useInterval(() => {
        if (!isAiModalOpen) {
            if (!isDirty) {
                loadData(true);
            } else {
                loadStatsOnly(true);
            }
        }
    }, 5000);

    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError(null);
        try {
            const [statsResult, workersResult] = await Promise.allSettled([
                refreshZones(true),
                manageService.getAssignedWorkers() // Use new API with merged details
            ]);

            // 1. Process Stats
            if (statsResult.status === "rejected") {
                console.error("Failed to load zone stats", statsResult.reason);
            }

            // 2. Process Workers (failure is non-blocking)
            if (workersResult.status === "fulfilled") {
                const fetchedWorkers = workersResult.value;
                setWorkers(fetchedWorkers);
                setLastAppliedWorkers(structuredClone(fetchedWorkers));
            } else {
                console.error("Failed to load workers", workersResult.reason);
                // Optionally show a toast or partial error, but don't block UI
                // setError(workersResult.reason?.message); // Uncomment if we want to blocking-fail
                setWorkers([]);
            }
            
            setPrevAppliedWorkers(null); 
        } catch (error: unknown) {
            console.error("Unexpected error in loadData", error);
            // setError(error.message); // Don't block UI
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const buildMoves = useCallback(() => {
        const originalById = new Map(lastAppliedWorkers.map(worker => [worker.userId, worker]));
        const moves: { workerId: number; toZoneId: number }[] = [];

        workers.forEach(worker => {
            const original = originalById.get(worker.userId);
            if (!original) return;
            if (worker.currentZoneId == null) return;
            if (original.currentZoneId !== worker.currentZoneId) {
                moves.push({ workerId: worker.userId, toZoneId: worker.currentZoneId });
            }
        });

        return moves;
    }, [lastAppliedWorkers, workers]);

    const previewMovedWorkerIds = isDirty ? buildMoves().map(m => m.workerId) : [];

    const loadStatsOnly = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError(null);
        try {
            if (isDirty) {
                const moves = buildMoves();
                const simulated = await manageService.getZoneStatsSimulated(moves);
                setStats(simulated);
            } else {
                await refreshZones(true);
            }
        } catch (error) {
            console.error("Failed to load zone stats", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [isDirty, buildMoves, refreshZones, setStats]);

    useEffect(() => {
        if (!isDirty || isAiModalOpen) return;
        const timer = setTimeout(() => {
            loadStatsOnly(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [isDirty, isAiModalOpen, loadStatsOnly, workers, lastAppliedWorkers]);

const handleDrop = (workerId: number, targetZoneId: number) => {
        setWorkers(prev => prev.map(w => {
            if (w.userId === workerId) {
                return { ...w, currentZoneId: targetZoneId };
            }
            return w;
        }));
    };
    
    // Restore Previous Layout Handler
    const handleRestorePrevious = () => {
        if (prevAppliedWorkers) {
            if (confirm("정말 이전 배치로 되돌리시겠습니까? 현재 작업 내용은 저장되지 않습니다.")) {
                setWorkers(structuredClone(prevAppliedWorkers));
            }
        }
    };


    const handleApply = async () => {
        setLoading(true);
        try {
            if (pendingAiMoves && pendingAiMoves.length > 0) {
                const zoneOverviews = await rebalanceService.apply(
                    pendingAiMoves,
                    "AI Recommendation Applied via Admin Manage"
                );

                if (zoneOverviews) {
                    alert("AI 추천 배치가 적용되었습니다.");
                    setLastMovedWorkerIds(pendingAiMoves.map((m) => m.worker_id));
                    setPendingAiMoves(null);

                    // Update stats immediately from response.
                    // `rebalance/apply` response doesn't include openIssueCount, so keep current values.
                    const issueCountByZone = new Map(stats.map(s => [s.zoneId, s.openIssueCount ?? 0]));
                    const merged = mergeZoneData(
                        zoneOverviews.map(z => ({
                            zoneId: z.zoneId,
                            name: z.zoneName,
                            status: z.status,
                            workerCount: z.workerCount,
                            workRate: z.progressRate,
                            openIssueCount: issueCountByZone.get(z.zoneId) ?? 0
                        }))
                    );
                    setStats(merged);

                    // Broadcast so Dashboard/Map can refresh without waiting
                    try {
                        const ts = String(Date.now());
                        localStorage.setItem("zones-refresh-ts", ts);
                        localStorage.setItem("zones-override", JSON.stringify({ ts, zones: merged }));
                        window.dispatchEvent(new Event("zones-refresh"));
                    } catch {
                        window.dispatchEvent(new Event("zones-refresh"));
                    }

                    // Refresh this screen in background (workers + stats)
                    loadData(true);
                } else {
                    alert("재배치 적용에 실패했습니다.");
                }
                setLoading(false);
                return;
            }

            // Calculate changed workers
            const changedWorkers = workers.filter((worker) => {
                 const original = lastAppliedWorkers.find(w => w.userId === worker.userId);
                 return original && original.currentZoneId !== worker.currentZoneId;
            });

            if (changedWorkers.length === 0) {
                alert("변경된 사항이 없습니다.");
                setLoading(false);
                return;
            }

            // Call API only for changed workers
            await manageService.updateWorkers(changedWorkers);
            alert("작업자 배치가 적용되었습니다.");

            // Update History with Deep Copy
            setPrevAppliedWorkers(structuredClone(lastAppliedWorkers));
            setLastAppliedWorkers(structuredClone(workers));
            setLastMovedWorkerIds(changedWorkers.map(w => w.userId));
            await loadStatsOnly(true);
            try {
                const ts = String(Date.now());
                localStorage.setItem("zones-refresh-ts", ts);
                window.dispatchEvent(new Event("zones-refresh"));
            } catch {
                window.dispatchEvent(new Event("zones-refresh"));
            }
        } catch (err) {
            console.error("Failed to apply changes", err);
            alert("배치 적용 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleAiReallocate = () => {
        setIsAiModalOpen(true);
    };

    const handleAiApply = async (newWorkers: DB_Worker[], moves?: RebalanceMove[]) => {
        setIsAiModalOpen(false);
        setLoading(true);

        if (moves && moves.length > 0) {
            console.log("[Manage] Applying AI Rebalance with moves:", moves);
            // Apply to UI only, persist when user clicks the black "적용" button
            setWorkers(newWorkers);
            setPendingAiMoves(moves);
            setLastMovedWorkerIds(moves.map((m) => m.worker_id));
            await loadStatsOnly(true);
            setLoading(false);
        } else {
            // Fallback: If no moves (e.g. manual adjustments in modal?), just update local state
            // Or if user manually dragged in the AI modal (if we supported that)
            // For now, let's treat it as draft if no explicit moves? 
            // Actually, the modal sends moves from recommendation. 
            // If user tampered with simulation manually, moves might not match.
            // But AiReallocationModal doesn't support manual drag properly yet (onDrop updates simulatedWorkers but not moves).
            // So for now, we trust 'moves' if present.
            
            setWorkers(newWorkers);
            setPendingAiMoves(null);
            await loadStatsOnly(true);
            setLoading(false);
            // Alert user that this is just a draft if not applied via API?
            // "AI 추천 결과가 리스트에 반영되었습니다. '적용' 버튼을 눌러 저장하세요."
        }
    };

    if (loading && stats.length === 0) {
        // Show loading but maybe empty layout first?
        return <div className="h-full flex items-center justify-center">데이터를 불러오는 중입니다...</div>;
    }

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-500">Error: {error}</div>;
    }




    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            <AdminPageHeader
                title="작업자 배치 관리"
                description="각 구역에 작업자를 배치하거나 AI 추천 배치를 적용합니다."
            >
                <div className="flex gap-2">
                    <Button
                        onClick={handleAiReallocate}
                        className="bg-[#304FFF] hover:bg-[#304FFF]/90 text-white gap-2 shadow-lg shadow-indigo-500/20 border-0 h-9 px-4 font-semibold rounded-full hover:scale-105 active:scale-95 transition-all duration-200"
                        size="sm"
                    >
                        <Wand2 size={16} className="text-white/90" />
                        AI 추천 배치
                    </Button>
                    <div className="w-px h-6 bg-slate-200 mx-2 self-center rounded-full" />
                    
                    <Button
                        variant="ghost"
                        onClick={handleRestorePrevious}
                        disabled={!prevAppliedWorkers}
                        className="gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-full transition-all duration-200 h-9 px-3"
                        title="이전 적용 배치 가져오기"
                        size="sm"
                    >
                        <RotateCcw size={16} />
                        <span className="text-xs font-medium">되돌리기</span>
                    </Button>

                    <Button
                        onClick={handleApply}
                        className="gap-2 bg-[#0F172A] hover:bg-[#0F172A]/90 text-white shadow-md hover:shadow-xl transition-all duration-200 h-9 px-5 font-bold rounded-full hover:scale-105 active:scale-95"
                        size="sm"
                    >
                        <Check size={16} strokeWidth={2.5} />
                        적용
                    </Button>
                </div>
            </AdminPageHeader>

            <div className="flex-1 flex flex-col min-h-0 px-8 pb-6 overflow-hidden">
                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 mb-3">
                    {displayStats.map(stat => (
                        <ManageStatisticCard
                            key={stat.zoneId}
                            zoneName={stat.name}
                            status={stat.status}
                            workerCount={stat.workerCount}
                            workRate={stat.workRate}
                            openIssueCount={stat.openIssueCount}
                            remainingDeadlineMinutes={stat.remainingDeadlineMinutes}
                            estimatedCompletionMinutes={stat.estimatedCompletionMinutes}
                            isPreview={isDirty}
                        />
                    ))}
                </div>

                {/* Bottom Zones Columns */}
                <div className="flex-1 overflow-x-auto min-h-0 p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 h-full min-w-[1000px] lg:min-w-0">
                        {displayStats.map(stat => (
                            <ManageZoneColumn
                                key={stat.zoneId}
                                zoneId={stat.zoneId}
                                zoneName={stat.name}
                                workers={workers.filter(w => w.currentZoneId === stat.zoneId)}
                                onDrop={handleDrop}
                                highlightWorkerIds={isDirty ? previewMovedWorkerIds : lastMovedWorkerIds}
                            />
                        ))}

                        {/* Unassigned / Waiting Area (Optional, if we have workers with null zone) */}
                        {workers.some(w => !w.currentZoneId) && (
                            <ManageZoneColumn
                                zoneId={0} // 0 for unassigned
                                zoneName="대기중"
                                workers={workers.filter(w => !w.currentZoneId)}
                                onDrop={handleDrop}
                                highlightWorkerIds={isDirty ? previewMovedWorkerIds : lastMovedWorkerIds}
                            />
                        )}
                    </div>
                </div>
                {/* AI Modal */}
                <AiReallocationModal
                    isOpen={isAiModalOpen}
                    onClose={() => setIsAiModalOpen(false)}
                    onApply={handleAiApply}
                    currentWorkers={workers}
                    zoneStats={stats}
                />
            </div>

            {/* 스크롤바 숨김 스타일 */}
            <style>{`
                .overflow-y-auto::-webkit-scrollbar,
                .overflow-x-auto::-webkit-scrollbar {
                    width: 0px;
                    height: 0px;
                    display: none;
                }
                .overflow-y-auto,
                .overflow-x-auto {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
