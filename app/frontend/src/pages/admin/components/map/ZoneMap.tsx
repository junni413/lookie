import type { DB_Worker, ZoneLayout } from "@/types/db";
import { cn } from "@/utils/cn";
import { Box } from "lucide-react";
import { getWorkRateBgColor } from "@/utils/styleHelpers";

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

    return (
        <div className="overflow-y-auto h-full w-full bg-slate-50/50 p-4 pb-10">
            {/* Grid container - 4 columns x 3 rows = 12 line blocks */}
            <div className="grid grid-cols-4 gap-2 max-w-full mx-auto">
                {layout.lines.map((line) => (
                    <div
                        key={line.line_number}
                        className="bg-white/60 rounded-xl border border-slate-200/60 p-2 flex flex-col gap-2 hover:bg-white hover:border-slate-300/60 transition-colors"
                    >
                        {/* Line Header */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">Line {line.line_number}</span>
                            {/* <span className="text-[9px] text-slate-400">{line.bins.length} bins</span> */}
                        </div>

                        {/* 3x2 Grid of bins (6 bins total per line) */}
                        <div className="grid grid-cols-3 gap-1.5">
                            {line.bins.map((bin) => {
                                const binWorkers = workers.filter(
                                    (w) =>
                                        w.current_zone_id === layout.zone_id &&
                                        w.line_number === line.line_number &&
                                        w.bin_number === bin.bin_number
                                );

                                const hasWorkers = binWorkers.length > 0;

                                return (
                                    <div
                                        key={`${line.line_number}-${bin.bin_number}`}
                                        className={cn(
                                            "relative aspect-square rounded-lg transition-all flex items-center justify-center gap-0.5",
                                            hasWorkers
                                                ? "bg-white border md:border-2 border-indigo-100 shadow-sm"
                                                : "bg-slate-50/50 border border-slate-100/50"
                                        )}
                                        title={`L${line.line_number}-B${bin.bin_number} (${binWorkers.length}명)`}
                                    >
                                        <span
                                            className={cn(
                                                "absolute top-1 left-1.5 text-[8px] font-mono",
                                                hasWorkers ? "text-indigo-300" : "text-slate-300"
                                            )}
                                        >
                                            {bin.bin_number}
                                        </span>

                                        <div className="flex gap-1 flex-wrap items-center justify-center p-1">
                                            {binWorkers.map((worker) => {
                                                const rate = worker.work_rate || 0;
                                                const dotColor = getWorkRateBgColor(rate);

                                                return (
                                                    <div
                                                        key={worker.worker_id}
                                                        className={cn(
                                                            "w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white",
                                                            dotColor
                                                        )}
                                                        title={`${worker.name} (진척률: ${rate}%)`}
                                                    />
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
