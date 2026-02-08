import type { DB_Worker, ZoneLayout } from "@/types/db";
import { cn } from "@/utils/cn";
import { Box } from "lucide-react";
import WorkerHoverCard from "../common/WorkerHoverCard";

interface ZoneMapProps {
    layout: ZoneLayout | null;
    workers: DB_Worker[];
}

export default function ZoneMap({ layout, workers }: ZoneMapProps) {
    if (!layout) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Box size={32} className="opacity-50" />
                <p className="text-sm">구역 레이아웃 정보가 없습니다.</p>
            </div>
        );
    }

    // Calculate rows for responsive fit
    const totalLines = layout.lines.length;
    const cols = 4;
    const rows = Math.ceil(totalLines / cols);

    return (
        <div className="h-full w-full bg-slate-50/50 p-6 overflow-hidden flex items-center justify-center">
            {/* Grid container - Fit height using dynamic rows */}
            <div 
                className="grid grid-cols-4 gap-3 w-full h-full max-w-7xl mx-auto"
                style={{ gridTemplateRows: `repeat(${Math.max(rows, 1)}, minmax(0, 1fr))` }}
            >
                {layout.lines.map((line) => (
                    <div
                        key={line.lineNumber}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col gap-2 hover:border-indigo-300 hover:shadow-md hover:ring-1 hover:ring-indigo-300 transition-all duration-300 ease-out overflow-hidden group"
                    >
                        {/* Line Header */}
                        <div className="flex items-center justify-between px-1 shrink-0">
                            <span className="text-[12px] font-bold text-slate-500 transition-colors group-hover:text-indigo-600">
                                Line {line.lineNumber}
                            </span>
                        </div>

                        {/* 3x2 Grid of bins (6 bins total per line) - Fit remaining space */}
                        <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
                            {line.bins.map((bin) => {
                                const binWorkers = workers.filter(
                                    (w) =>
                                        w.currentZoneId === layout.zoneId &&
                                        w.lineNumber === line.lineNumber &&
                                        w.binNumber === bin.binNumber
                                );

                                const hasWorkers = binWorkers.length > 0;

                                return (
                                    <div
                                        key={`${line.lineNumber}-${bin.binNumber}`}
                                        className={cn(
                                            "relative w-full h-full rounded-lg transition-all flex items-center justify-center overflow-hidden",
                                            hasWorkers
                                                ? "bg-indigo-50/30 border border-indigo-200 shadow-sm"
                                                : "bg-slate-50/50 border border-slate-100"
                                        )}
                                        title={`L${line.lineNumber}-B${bin.binNumber} (${binWorkers.length}명)`}
                                    >
                                        <span
                                            className={cn(
                                                "absolute top-1 left-1.5 text-[10px] font-bold z-10 transition-colors pointer-events-none",
                                                hasWorkers ? "text-indigo-500" : "text-slate-300 group-hover:text-slate-400"
                                            )}
                                        >
                                            {bin.binNumber}
                                        </span>

                                        <div className="absolute inset-0 flex gap-0.5 flex-wrap items-center justify-center p-1 content-center pointer-events-auto">
                                            {binWorkers.map((worker) => {
                                                const isBottleneck = worker.isBottleneck;
                                                const dotColor = isBottleneck 
                                                    ? "bg-amber-500 shadow-amber-200" 
                                                    : "bg-indigo-500 shadow-indigo-200";

                                                return (
                                                    <WorkerHoverCard key={worker.userId} workerId={worker.userId}>
                                                        <div
                                                            className={cn(
                                                                "w-3 h-3 rounded-full shadow-sm ring-2 ring-white cursor-pointer hover:scale-110 transition-all shrink-0 relative z-20",
                                                                dotColor
                                                            )}
                                                            title={`${worker.name} ${isBottleneck ? "(병목)" : "(정상)"}`}
                                                        />
                                                    </WorkerHoverCard>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
