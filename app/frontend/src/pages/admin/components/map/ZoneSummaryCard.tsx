import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { Users, Activity } from "lucide-react";
import type { ZoneStatus } from "@/types/db";
import { getZoneStyle } from "@/utils/zoneUtils";

interface ZoneSummaryCardProps {
    zoneName: string;
    workerCount: number;
    workRate: number; // 0-100
    status: ZoneStatus;
    isSelected: boolean;
    onCardClick: () => void; // For Layout Map
    onNameClick: () => void; // For Worker List
}

export default function ZoneSummaryCard({
    zoneName,
    workerCount,
    workRate,
    status,
    isSelected,
    onCardClick,
    onNameClick
}: ZoneSummaryCardProps) {

    const style = getZoneStyle(status);

    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNameClick();
    };

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-300 ease-out flex flex-col justify-between p-5 relative overflow-hidden border h-full",
                style.card,
                !isSelected && style.hover, // Only apply hover effect when not selected
                isSelected && cn("scale-[1.01]", style.active) // Apply active style when selected
            )}
            onClick={onCardClick}
        >
            {/* Top Row: Title & Badge */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "text-lg font-bold tracking-wider uppercase transition-colors",
                            style.title
                        )}
                    >
                        {zoneName}
                    </span>

                    <button
                        onClick={handleNameClick}
                        className={cn(
                            "p-1 rounded-full text-slate-400 transition-colors z-10",
                            style.actionButton
                        )}
                        title="작업자 목록 패널 열기"
                    >
                        <Users size={16} />
                    </button>
                </div>

                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", style.badge)}>
                    {style.badgeIcon}
                    <span>{style.badgeLabel}</span>
                </div>
            </div>

            {/* Bottom Row: Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Metric 1: Workers */}
                <div className="flex flex-col gap-1">
                    <div className={cn("flex items-center gap-1.5 text-xs font-semibold", style.itemLabel)}>
                        <Users size={14} />
                        <span>작업자</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={cn("text-3xl font-bold tracking-tight", style.itemValue)}>{workerCount}</span>
                        <span className={cn("text-sm font-medium opacity-60", style.itemValue)}>명</span>
                    </div>
                </div>

                {/* Metric 2: Progress */}
                <div className="flex flex-col gap-1 pl-4 border-l border-slate-400/10">
                    <div className={cn("flex items-center gap-1.5 text-xs font-semibold", style.itemLabel)}>
                        <Activity size={14} />
                        <span>진행률</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={cn("text-3xl font-bold tracking-tight", style.itemValue)}>{Math.floor(workRate)}</span>
                        <span className={cn("text-sm font-medium opacity-60", style.itemValue)}>%</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
