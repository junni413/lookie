import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { getZoneStyle } from "@/utils/zoneUtils";
import type { ZoneStatus } from "@/types/db";

interface ManageStatisticCardProps {
    zoneName: string;
    status: ZoneStatus;
    workerCount: number;
    workRate: number;
}

export default function ManageStatisticCard({
    zoneName,
    status,
    workerCount,
    workRate
}: ManageStatisticCardProps) {
    const style = getZoneStyle(status);

    return (
        <Card className="border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white rounded-2xl h-full group ring-1 ring-slate-100 cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100" />
            
            <CardContent className="p-5 h-full flex items-center gap-4 relative z-10">
                {/* 왼쪽: 원형 구역 배지 (Gradient & Shadow) */}
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 shadow-[0_2px_8px_-3px_rgba(99,102,241,0.15)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-600 tracking-tighter">
                        {(zoneName || "").replace(/^zone\s*/i, '')}
                    </span>
                </div>

                {/* 오른쪽: 배지 및 정보 */}
                <div className="flex-1 flex flex-col justify-center h-full gap-3">
                    {/* 상단: 상태 배지 */}
                    <div className="flex justify-end items-start">
                        <div className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-colors", 
                            style.badge
                        )}>
                            {style.badgeIcon}
                            <span>{style.badgeLabel}</span>
                        </div>
                    </div>

                    {/* 하단: 작업자 및 진행률 */}
                    <div className="flex items-center gap-5">
                        {/* 작업자 */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Workers</span>
                            <div className="flex items-center gap-1">
                                <span className="text-lg font-extrabold text-slate-700 leading-none">{workerCount}</span>
                                <span className="text-xs font-semibold text-slate-400">명</span>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-slate-100/80" />

                        {/* 진행률 */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Progress</span>
                            <div className="flex items-center gap-1">
                                <span className="text-lg font-extrabold text-slate-700 leading-none">{Math.floor(workRate)}</span>
                                <span className="text-xs font-semibold text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
