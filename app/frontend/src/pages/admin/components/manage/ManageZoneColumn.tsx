import type { DB_Worker } from "@/types/db";
import ManageWorkerCard from "./ManageWorkerCard";
import { Users } from "lucide-react";

interface ManageZoneColumnProps {
    zoneId: number;
    zoneName: string;
    workers: DB_Worker[];
    onDrop: (workerId: number, targetZoneId: number) => void;
    highlightWorkerIds?: number[];
}

export default function ManageZoneColumn({ zoneId, zoneName, workers, onDrop, highlightWorkerIds }: ManageZoneColumnProps) {
    void zoneName; // Used by AIReallocationModal

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const workerId = Number(e.dataTransfer.getData("workerId"));
        if (workerId) {
            onDrop(workerId, zoneId);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, workerId: number) => {
        e.dataTransfer.setData("workerId", String(workerId));
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            className="flex flex-col bg-white rounded-xl h-full border border-slate-200 hover:border-primary/30 transition-colors shadow-sm"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Droppable Area */}
            <div className="flex-1 overflow-y-auto min-h-[300px] flex flex-col scrollbar-hide py-2">
                {workers.map(worker => (
                    <ManageWorkerCard
                        key={worker.userId}
                        worker={worker}
                        onDragStart={handleDragStart}
                        isMoved={highlightWorkerIds?.includes(worker.userId)}
                    />
                ))}

                {workers.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300 min-h-[200px]">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                            <Users size={20} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">작업자 없음</p>
                        <p className="text-[11px] text-slate-400/70 mt-1 max-w-[120px] leading-relaxed">
                            이 구역에 배치된<br/>작업자가 없습니다
                        </p>
                        <div className="mt-4 px-3 py-1.5 bg-slate-50 rounded text-[10px] text-slate-400 font-medium">
                            드래그하여 배치
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
