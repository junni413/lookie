import type { DB_Worker } from "@/types/db";
import { Card } from "@/components/ui/card";

interface ManageWorkerCardProps {
    worker: DB_Worker;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, workerId: number) => void;
    isMoved?: boolean;
}

export default function ManageWorkerCard({ worker, onDragStart, isMoved }: ManageWorkerCardProps) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, worker.worker_id)}
            className="group cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform duration-150"
        >
            <Card className={`p-3 border-slate-200 shadow-sm hover:shadow-md transition-shadow ${isMoved ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300" : "bg-white"
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-900">{worker.name}</h4>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isMoved ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 bg-slate-100"
                        }`}>
                        {worker.current_zone_id ? `Zone ${worker.current_zone_id}` : '대기'}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>금일 작업</span>
                    <span className="font-medium text-slate-700">{worker.today_work_count}건</span>
                </div>
            </Card>
        </div>
    );
}
