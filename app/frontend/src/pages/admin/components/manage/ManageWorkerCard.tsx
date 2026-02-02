import type { DB_Worker } from "@/types/db";
import { Card } from "@/components/ui/card";
import { User, Briefcase } from "lucide-react";
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
            onDragStart={(e) => onDragStart(e, worker.worker_id)}
            className="group cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform duration-150"
        >
            <Card className={cn(
                "p-3.5 border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md transition-all bg-white rounded-xl",
                isMoved && "ring-2 ring-indigo-500 ring-offset-2"
            )}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                            <User size={14} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-800 leading-tight">{worker.name}</h4>
                            <span className="text-[10px] text-slate-400">#{worker.worker_id}</span>
                        </div>
                    </div>

                    {worker.current_zone_id && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Z{worker.current_zone_id}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Briefcase size={10} /> Work
                    </span>
                    <span className="text-xs font-bold text-slate-700">{worker.today_work_count}</span>
                </div>
            </Card>
        </div>
    );
}
