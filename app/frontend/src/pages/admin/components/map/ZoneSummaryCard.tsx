import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { Users, Activity } from "lucide-react";

interface ZoneSummaryCardProps {
    zoneName: string;
    workerCount: number;
    workRate: number; // 0-100
    status: "NORMAL" | "BUSY" | "ISSUE";
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

    // Updated Color Scheme per User Request
    // Normal (Stable): Greenish
    // Busy (Good): Yellow/Orange
    // Issue (Risk): Red
    const statusColor = {
        NORMAL: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
        BUSY: "bg-amber-50 border-amber-200 hover:bg-amber-100",
        ISSUE: "bg-red-50 border-red-200 hover:bg-red-100",
    };

    const statusBadgeColor = {
        NORMAL: "bg-emerald-200 text-emerald-700",
        BUSY: "bg-amber-200 text-amber-700",
        ISSUE: "bg-red-200 text-red-700",
    };

    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNameClick();
    };

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-200 relative overflow-hidden",
                statusColor[status],
                isSelected ? "ring-2 ring-primary ring-offset-2 scale-[1.02]" : "hover:-translate-y-1"
            )}
            onClick={onCardClick}
        >
            <div className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        {/* Interactive Zone Name */}
                        <h3
                            onClick={handleNameClick}
                            className="text-2xl font-bold text-slate-800 hover:underline hover:text-primary cursor-pointer w-fit transition-colors"
                            title="클릭하여 작업자 리스트 보기"
                        >
                            {zoneName}
                        </h3>
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block", statusBadgeColor[status])}>
                            {status === "NORMAL" ? "안정" : status === "BUSY" ? "양호" : "주의"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Users size={14} /> 근무자
                        </span>
                        <span className="text-2xl font-bold text-slate-700">
                            {workerCount} <span className="text-sm text-slate-500 font-normal">명</span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Activity size={14} /> 작업률(이슈)
                        </span>
                        <span className={cn("text-2xl font-bold", status === 'ISSUE' ? "text-red-600" : "text-slate-700")}>
                            {workRate}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Active Indicator Bar */}
            {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary" />
            )}
        </Card>
    );
}
