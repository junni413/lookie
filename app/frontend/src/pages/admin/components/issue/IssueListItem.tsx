import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import type { IssueResponse, IssueType } from "@/types/db";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

interface IssueListItemProps {
    issue: IssueResponse;
    selected?: boolean;
    onClick?: () => void;
}

function IssueTypeBadge({ type }: { type: IssueType }) {
    if (type === "OUT_OF_STOCK") {
        // 재고: Alert 컬러(빨강)
        return <Badge className="rounded-full bg-destructive px-2 py-0.5 text-xs text-white hover:bg-destructive">재고</Badge>;
    }
    // 파손: Primary 느낌(파랑)
    return <Badge className="rounded-full bg-primary px-2 py-0.5 text-xs text-white hover:bg-primary">파손</Badge>;
}

export default function IssueListItem({ issue, selected, onClick }: IssueListItemProps) {
    const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

    // Get worker info safely (fallback if missing)
    const worker = issue.worker || {
        status: "OFF_WORK",
        today_work_count: 0,
        current_zone_id: null, // "Unknown"
        name: issue.workerName
    } as any;

    const getStatusText = (s: string) => {
        if (s === "WORKING") return "🟢 작업중";
        if (s === "PAUSED") return "🟡 휴식중";
        return "⚪ 퇴근/대기";
    };

    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Position to the right of the name
        setPopoverPos({
            x: rect.right + 12,
            y: rect.top + rect.height / 2
        });
    };

    const closePopover = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPopoverPos(null);
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all cursor-pointer",
                selected
                    ? "bg-muted border-primary/50 text-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-muted/50 hover:shadow-md"
            )}
        >
            {/* Main Text */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 relative">
                    {/* Interactive Worker Name */}
                    <div className="relative group/worker">
                        <span
                            className={cn(
                                "truncate font-semibold text-base hover:underline hover:text-blue-600 cursor-help transition-colors",
                                selected ? "text-foreground" : "text-foreground/90"
                            )}
                            onClick={handleNameClick}
                        >
                            {issue.workerName}
                        </span>

                        {/* Portal Popover */}
                        {popoverPos && createPortal(
                            <>
                                <div
                                    className="fixed inset-0 z-50 bg-transparent"
                                    onClick={closePopover}
                                />
                                <div
                                    className="fixed z-50 w-48 bg-popover text-popover-foreground rounded-lg border shadow-lg p-3 animate-in fade-in zoom-in-95 bg-white"
                                    style={{
                                        top: popoverPos.y,
                                        left: popoverPos.x,
                                        transform: "translateY(-50%)"
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold">{getStatusText(worker.status)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-muted-foreground">현재 작업 중인 지번</span>
                                            <span className="text-sm">{worker.current_zone_id ? `${worker.current_zone_id}번 구역` : "-"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-muted-foreground">금일 작업량</span>
                                            <span className="text-sm">{worker.today_work_count} 건</span>
                                        </div>
                                    </div>
                                </div>
                            </>,
                            document.body
                        )}
                    </div>

                    {issue.status === "RESOLVED" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">완료</Badge>
                    )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{issue.zoneName}</div>
            </div>

            {/* Right Meta */}
            <div className="flex flex-col items-end gap-1">
                <IssueTypeBadge type={issue.issue_type} />
                <div className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(issue.created_at)}</div>
            </div>
        </div>
    );
}
