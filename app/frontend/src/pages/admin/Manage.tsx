import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import { Button } from "@/components/ui/button";

import { manageService } from "@/services/manageService";
import type { ZoneStat } from "@/types/db"; // Import from shared types
import type { DB_Worker } from "@/types/db";
import { DEFAULT_ZONES } from "@/utils/zoneUtils"; // Import shared constant
import ManageStatisticCard from "./components/manage/ManageStatisticCard";
import ManageZoneColumn from "./components/manage/ManageZoneColumn";
import AiReallocationModal from "./components/manage/AiReallocationModal";
import { RotateCcw, Wand2, Check } from "lucide-react";


export default function Manage() {
    // Init with Defaults to prevent flash of empty content
    const [stats, setStats] = useState<ZoneStat[]>(DEFAULT_ZONES);
    const [workers, setWorkers] = useState<DB_Worker[]>([]);

    // History State
    const [lastAppliedWorkers, setLastAppliedWorkers] = useState<DB_Worker[]>([]);
    const [prevAppliedWorkers, setPrevAppliedWorkers] = useState<DB_Worker[] | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsResult, workersResult] = await Promise.allSettled([
                manageService.getZoneStats(),
                manageService.getAssignedWorkers() // Use new API with merged details
            ]);

            // 1. Process Stats
            if (statsResult.status === "fulfilled") {
                const fetchedStats = statsResult.value;
                // fetchedStats coming from manageService.getZoneStats() which already uses mergeZoneData
                // So it is guaranteed to be ZoneStat[] with length 4
                setStats(fetchedStats.length > 0 ? fetchedStats : DEFAULT_ZONES);
            } else {
                console.error("Failed to load zone stats", statsResult.reason);
                // Keep DEFAULT_ZONES (already init state)
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
        } catch (error: any) {
            console.error("Unexpected error in loadData", error);
            // setError(error.message); // Don't block UI
        } finally {
            setLoading(false);
        }
    };

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

    const handleAiApply = (newWorkers: DB_Worker[]) => {
        setWorkers(newWorkers);
        setIsAiModalOpen(false);
    };

    if (loading && stats.length === 0) {
        // Show loading but maybe empty layout first? 
        // Actually, let's init state with DEFAULT_ZONES so we never show "Loading..." text for empty structure
        // But if we want to show spinner:
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
                        className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                        size="sm"
                    >
                        <Wand2 size={16} />
                        AI 추천 재배치
                    </Button>
                    <div className="w-px h-8 bg-slate-200 mx-1" />
                    
                    <Button
                        variant="outline"
                        onClick={handleRestorePrevious}
                        disabled={!prevAppliedWorkers}
                        className="gap-2 text-slate-600 shadow-sm"
                        title="이전 적용 배치 가져오기"
                        size="sm"
                    >
                        <RotateCcw size={16} />
                        이전 배치
                    </Button>

                    <Button
                        onClick={handleApply}
                        className="gap-2 shadow-sm"
                        size="sm"
                    >
                        <Check size={16} />
                        적용
                    </Button>
                </div>
            </AdminPageHeader>

            <div className="flex-1 flex flex-col min-h-0 px-8 pb-6 space-y-5 overflow-hidden">
                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    {stats.map(stat => (
                        <ManageStatisticCard
                            key={stat.zoneId}
                            zoneName={stat.name}
                            status={stat.status}
                            workerCount={workers.filter(w => w.currentZoneId === stat.zoneId).length} // Dynamic count
                            workRate={stat.workRate}
                        />
                    ))}
                </div>

                {/* Bottom Zones Columns */}
                <div className="flex-1 overflow-x-auto min-h-0 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-w-[1000px] lg:min-w-0">
                        {stats.map(stat => (
                            <ManageZoneColumn
                                key={stat.zoneId}
                                zoneId={stat.zoneId}
                                zoneName={stat.name}
                                workers={workers.filter(w => w.currentZoneId === stat.zoneId)}
                                onDrop={handleDrop}
                            />
                        ))}

                        {/* Unassigned / Waiting Area (Optional, if we have workers with null zone) */}
                        {workers.some(w => !w.currentZoneId) && (
                            <ManageZoneColumn
                                zoneId={0} // 0 for unassigned
                                zoneName="대기중"
                                workers={workers.filter(w => !w.currentZoneId)}
                                onDrop={handleDrop}
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
