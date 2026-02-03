import type { DB_Worker } from "@/types/db";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface ManageWorkerCardProps {
    worker: DB_Worker;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, workerId: number) => void;
    isMoved?: boolean;
}

export default function ManageWorkerCard({ worker, onDragStart, isMoved }: ManageWorkerCardProps) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, worker.user_id)}
            className="group cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform duration-150"
        >
            <Card className={cn(
                "p-2.5 border-0 shadow-sm hover:shadow-md transition-all bg-white rounded-lg",
                isMoved && "ring-2 ring-primary ring-offset-1"
            )}>
                <div className="flex items-center justify-between gap-2">
                    {/* 왼쪽: 이름 및 ID */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm text-slate-800 leading-tight truncate">{worker.name}</h4>
                            <span className="text-[10px] text-slate-400">#{worker.user_id}</span>
                        </div>
                    </div>

                    {/* 오른쪽: 작업 건수 및 구역 */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-700">{worker.today_work_count}건</span>
                        {worker.current_zone_id && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Z{worker.current_zone_id}
                            </span>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
