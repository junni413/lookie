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
            <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[300px]">
                {workers.map(worker => (
                    <ManageWorkerCard
                        key={worker.user_id}
                        worker={worker}
                        onDragStart={handleDragStart}
                        isMoved={highlightWorkerIds?.includes(worker.user_id)}
                    />
                ))}

                {workers.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                        <div className="text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-xs">작업자를 드래그하세요</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
