import type { DB_Worker, ZoneLayout } from "@/types/db";
import { Layers } from "lucide-react";
import ZoneMap from "./ZoneMap";

interface ZoneDetailPanelProps {
    layout: ZoneLayout | null;
    allWorkers: DB_Worker[];
}

export default function ZoneDetailPanel({
    layout,
    allWorkers,
}: ZoneDetailPanelProps) {
    return (
        <div className="h-full flex flex-col pt-0">
            {/* Content Wrapper */}

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden h-full">
                {/* Map Visualization Area */}
                <div className="flex-1 bg-white rounded-lg border shadow-sm p-4 overflow-hidden flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <Layers size={16} /> 공간 구조 및 작업자 배치
                        </h3>
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                <span>상(80%↑)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span>중(40~79%)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                <span>하(~39%)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 border rounded bg-slate-50 relative overflow-hidden">
                        <ZoneMap
                            layout={layout}
                            workers={allWorkers}
                        />
                    </div>

                    <div className="mt-3 text-xs text-slate-400 text-center">
                        * 각 점은 해당 지번(Bin)에 할당된 작업자 1명을 나타냅니다.
                    </div>
                </div>
            </div>
        </div>
    );
}
