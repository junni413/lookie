import type { DB_Worker } from "@/types/db";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import WorkerHoverCard from "../common/WorkerHoverCard";

interface ManageWorkerCardProps {
    worker: DB_Worker;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, workerId: number) => void;
    isMoved?: boolean;
}

export default function ManageWorkerCard({ worker, onDragStart, isMoved }: ManageWorkerCardProps) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, worker.userId)}
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
                            <WorkerHoverCard workerId={worker.userId}>
                                <h4 className="font-semibold text-sm text-slate-800 leading-tight truncate hover:text-blue-600 transition-colors cursor-help inline-block">
                                    {worker.name}
                                </h4>
                            </WorkerHoverCard>
                        </div>
                    </div>

                    {/* 오른쪽: 작업 건수 및 구역 */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-700">{worker.todayWorkCount}건</span>
                    </div>
                </div>
                
                {/* 하단: 상세 스탯 (처리속도, 진행률) */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex gap-2">
                        <span>속도 <span className="font-semibold text-slate-700">{worker.processingSpeed || 0}</span></span>
                        <span>진행 <span className="font-semibold text-slate-700">{Math.floor(worker.currentTaskProgress || 0)}%</span></span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
