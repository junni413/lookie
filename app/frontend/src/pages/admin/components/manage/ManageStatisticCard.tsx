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
        <Card className="border-0 shadow-sm hover:shadow-md bg-white transition-all duration-300 rounded-2xl h-full group ring-1 ring-slate-100/80 cursor-pointer">
            <CardContent className="p-5 h-full flex items-center gap-3">
                {/* 왼쪽: 원형 구역 배지 */}
                <div className="shrink-0 w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center transition-transform group-hover:scale-110">
                    <span className="text-2xl font-bold text-primary">
                        {zoneName.replace(/^zone\s*/i, '')}
                    </span>
                </div>

                {/* 오른쪽: 배지 및 정보 */}
                <div className="flex-1 flex flex-col justify-between h-full py-0">
                    {/* 상단: 상태 배지 */}
                    <div className="flex justify-end">
                        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1", style.badge)}>
                            {style.badgeIcon}
                            <span>{style.badgeLabel}</span>
                        </div>
                    </div>

                    {/* 하단: 작업자 및 진행률 */}
                    <div className="flex items-center gap-4">
                        {/* 작업자 */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">작업자</span>
                            <span className="text-base font-bold text-slate-800 whitespace-nowrap">{workerCount}명</span>
                        </div>

                        {/* 진행률 */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">진행률</span>
                            <span className="text-base font-bold text-slate-800 whitespace-nowrap">{workRate}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
