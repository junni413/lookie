import type { DB_Worker } from "@/types/db";
import ManageWorkerCard from "./ManageWorkerCard";

interface ManageZoneColumnProps {
    zoneId: number;
    zoneName: string;
    workers: DB_Worker[];
    onDrop: (workerId: number, targetZoneId: number) => void;
    highlightWorkerIds?: number[];
}

export default function ManageZoneColumn({ zoneId, zoneName, workers, onDrop, highlightWorkerIds }: ManageZoneColumnProps) {

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Essential to allow drop
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const workerId = Number(e.dataTransfer.getData("workerId"));
        if (workerId) {
            onDrop(workerId, zoneId);
        }
    };

    // Custom drag start handler to pass down
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, workerId: number) => {
        e.dataTransfer.setData("workerId", String(workerId));
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            className="flex flex-col bg-slate-50/50 rounded-2xl h-full border border-transparent hover:border-blue-100 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="p-4 text-center border-b border-slate-100/50">
                <h3 className="text-xl font-bold text-slate-800">{zoneName}</h3>
            </div>

            {/* Droppable Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
                {workers.map(worker => (
                    <ManageWorkerCard
                        key={worker.worker_id}
                        worker={worker}
                        onDragStart={handleDragStart}
                        isMoved={highlightWorkerIds?.includes(worker.worker_id)}
                    />
                ))}

                {workers.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                        Drop Worker Here
                    </div>
                )}
            </div>
        </div>
    );
}
