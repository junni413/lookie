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
        <div className="overflow-auto h-full w-full">
            <div className="flex flex-col gap-3 min-w-[500px] p-2">
                {layout.lines.map((line) => (
                    <div key={line.line_number} className="flex gap-2">
                        {/* Line Label */}
                        <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded text-slate-500 text-xs font-bold shrink-0 shadow-sm border border-slate-200">
                            L{line.line_number}
                        </div>

                        {/* Bins Row */}
                        <div className="flex gap-2">
                            {line.bins.map((bin) => {
                                // Find workers in this bin AND in this zone
                                const binWorkers = workers.filter(w =>
                                    w.current_zone_id === layout.zone_id &&
                                    w.line_number === line.line_number &&
                                    w.bin_number === bin.bin_number
                                );

                                const hasWorkers = binWorkers.length > 0;

                                return (
                                    <div
                                        key={`${line.line_number}-${bin.bin_number}`}
                                        className={cn(
                                            "relative w-12 h-12 shrink-0 rounded border transition-all flex items-center justify-center gap-0.5",
                                            hasWorkers
                                                ? "bg-white border-slate-300 shadow-sm"
                                                : "bg-slate-50 border-slate-100"
                                        )}
                                        title={`L${line.line_number}-B${bin.bin_number} (${binWorkers.length}명)`}
                                    >
                                        {/* Bin Number (Subtle) */}
                                        <span className="absolute top-[2px] left-[3px] text-[7px] text-slate-300 font-mono">
                                            {bin.bin_number}
                                        </span>

                                        {/* Worker Dots */}
                                        {binWorkers.map((worker) => {
                                            const rate = worker.work_rate || 0;
                                            // Palette: Indigo(High) -> Blue(Mid) -> Cyan(Low)
                                            const dotColor = getWorkRateBgColor(rate);

                                            // Check pause status if we want to show it? User asked to focus on work rate. 
                                            // But maybe overlay? For now, stick to user request: "Mark based on work rate".

                                            return (
                                                <div
                                                    key={worker.worker_id}
                                                    className={cn(
                                                        "w-3.5 h-3.5 rounded-full border-2 border-white shadow-md z-10",
                                                        dotColor
                                                    )}
                                                    title={`${worker.name} (진척률: ${rate}%)`}
                                                />
                                            );
                                        })}
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
