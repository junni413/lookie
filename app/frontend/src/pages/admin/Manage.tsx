import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { manageService, type ZoneStat } from "@/services/manageService";
import type { DB_Worker } from "@/types/db";
import ManageStatisticCard from "./components/manage/ManageStatisticCard";
import ManageZoneColumn from "./components/manage/ManageZoneColumn";
import AiReallocationModal from "./components/manage/AiReallocationModal";
import { RotateCcw, Wand2, Check } from "lucide-react";

export default function Manage() {
    const [stats, setStats] = useState<ZoneStat[]>([]);
    const [workers, setWorkers] = useState<DB_Worker[]>([]);

    // History State
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
            const [fetchedStats, fetchedWorkers] = await Promise.all([
                manageService.getZoneStats(),
                manageService.getAllWorkers()
            ]);
            setStats(fetchedStats);
            setWorkers(fetchedWorkers);
            setLastAppliedWorkers(fetchedWorkers);
            setPrevAppliedWorkers(null);
        } catch (error: any) {
            console.error("Failed to load manage data", error);
            setError(error.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (workerId: number, targetZoneId: number) => {
        setWorkers(prev => prev.map(w => {
            if (w.worker_id === workerId) {
                return { ...w, current_zone_id: targetZoneId };
            }
            return w;
        }));
    };

    const handleReset = () => {
        setWorkers([...lastAppliedWorkers]);
    };

    const handleRestorePrevious = () => {
        if (prevAppliedWorkers) {
            if (confirm("정말 이전 배치로 되돌리시겠습니까? 현재 작업 내용은 저장되지 않습니다.")) {
                setWorkers([...prevAppliedWorkers]);
            }
        }
    };

    const handleApply = async () => {
        // Mock apply action
        alert("작업자 배치가 적용되었습니다.");

        setPrevAppliedWorkers(lastAppliedWorkers);
        setLastAppliedWorkers(workers);
    };

    const handleAiReallocate = () => {
        setIsAiModalOpen(true);
    };

    const handleAiApply = (newWorkers: DB_Worker[]) => {
        setWorkers(newWorkers);
        setIsAiModalOpen(false);
    };

    if (loading && stats.length === 0) {
        return <div className="h-full flex items-center justify-center">Loading...</div>;
    }

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-500">Error: {error}</div>;
    }

    // Diff check for "Reset" button (enable only if changed)
    const hasChanges = JSON.stringify(workers) !== JSON.stringify(lastAppliedWorkers);

    return (
        <div className="h-full flex flex-col gap-6 p-2">
            {/* Header Area */}
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-bold">작업자 관리</h1>
                <div className="flex gap-2">
                    <Button
                        onClick={handleAiReallocate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <Wand2 size={16} />
                        AI 추천 재배치
                    </Button>
                    <div className="w-px h-8 bg-slate-200 mx-1" />

                    {/* Previous Restore Button */}
                    <Button
                        variant="outline"
                        onClick={handleRestorePrevious}
                        disabled={!prevAppliedWorkers}
                        className="gap-2 text-slate-600"
                        title="이전 적용 배치 가져오기"
                    >
                        <RotateCcw size={16} />
                        이전 배치
                    </Button>

                    {/* Reset Button */}
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={!hasChanges}
                        className="gap-2 text-slate-600"
                        title="현재 변경사항 초기화"
                    >
                        <RotateCcw size={16} />
                        되돌리기
                    </Button>

                    <Button
                        onClick={handleApply}
                        className="gap-2"
                    >
                        <Check size={16} />
                        적용
                    </Button>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                {stats.map(stat => (
                    <ManageStatisticCard
                        key={stat.zone_id}
                        zoneName={stat.name}
                        status={stat.status}
                        workerCount={workers.filter(w => w.current_zone_id === stat.zone_id).length} // Dynamic count
                        workRate={stat.work_rate}
                    />
                ))}
            </div>

            {/* Bottom Zones Columns */}
            <div className="flex-1 overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-w-[1000px] lg:min-w-0">
                    {stats.map(stat => (
                        <ManageZoneColumn
                            key={stat.zone_id}
                            zoneId={stat.zone_id}
                            zoneName={stat.name}
                            workers={workers.filter(w => w.current_zone_id === stat.zone_id)}
                            onDrop={handleDrop}
                        />
                    ))}

                    {/* Unassigned / Waiting Area (Optional, if we have workers with null zone) */}
                    {workers.some(w => !w.current_zone_id) && (
                        <ManageZoneColumn
                            zoneId={0} // 0 for unassigned
                            zoneName="대기중"
                            workers={workers.filter(w => !w.current_zone_id)}
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
    );
}
