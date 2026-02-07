import type { DB_Worker } from "@/types/db";
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
            className={cn(
                "group cursor-grab active:cursor-grabbing hover:bg-slate-50/80 transition-colors p-3 border-b border-slate-100 last:border-0",
                isMoved && "bg-primary-soft ring-1 ring-inset ring-primary/20"
            )}
        >
            <div className="flex items-center gap-3">
                {/* 정보 영역 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <WorkerHoverCard workerId={worker.userId}>
                        <div className="font-bold text-xs text-slate-700 truncate hover:text-blue-600 transition-colors cursor-help inline-block align-middle">
                            {worker.name}
                        </div>
                    </WorkerHoverCard>
                    <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                        {!worker.currentZoneId && "대기중"}
                        {worker.lineNumber && `L${worker.lineNumber}`}
                    </div>
                </div>

                {/* 통계 정보 */}
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                    <div className="text-center min-w-[28px]">
                        <div className="text-slate-300 text-[9px] font-semibold mb-0.5">건수</div>
                        <div className="font-bold text-slate-700">{worker.todayWorkCount}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-center min-w-[28px]">
                        <div className="text-slate-300 text-[9px] font-semibold mb-0.5">작업률</div>
                        <div className="font-bold text-slate-700">
                            {Math.floor(worker.workRate || 0)}%
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-center min-w-[28px]">
                        <div className="text-slate-300 text-[9px] font-semibold mb-0.5">속도</div>
                        <div className="font-bold text-slate-700">{worker.processingSpeed || 0}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
