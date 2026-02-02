import { useState } from "react";
import { createPortal } from "react-dom";
import type { IssueResponse } from "@/types/db";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

interface IssueListItemProps {
    issue: IssueResponse;
    selected?: boolean;
    onClick?: () => void;
}

export default function IssueListItem({ issue, selected, onClick }: IssueListItemProps) {
    const isOutOfStock = issue.issue_type === "OUT_OF_STOCK";
    const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

    const worker = issue.worker || {
        worker_id: -1, // Dummy ID
        status: "OFF_WORK",
        today_work_count: 0,
        current_zone_id: null,
        name: issue.workerName || "Unknown"
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
                "w-full flex items-center justify-between px-5 py-3 rounded-2xl cursor-pointer",
                selected
                    ? "bg-indigo-50/50 border border-indigo-100 shadow-sm"
                    : "transition-all duration-300 ease-out hover:bg-white hover:shadow-md hover:scale-[1.005] bg-transparent border border-transparent"
            )}>
            {/* Left: Worker & Zone */}
            <div className="flex flex-col gap-1">
                {/* Interactive Worker Name */}
                <span
                    onClick={handleNameClick}
                    className="font-bold text-slate-800 text-sm leading-tight transition-colors hover:text-blue-600 cursor-help relative group/worker"
                >
                    {issue.workerName || "작업자"}
                </span>

                {/* Portal Popover */}
                {popoverPos && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-50 bg-transparent"
                            onClick={closePopover}
                        />
                        <div
                            className="fixed z-50 w-56 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            style={{
                                top: popoverPos.y,
                                left: popoverPos.x,
                                transform: "translateY(-50%)"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <span className="font-bold text-sm text-slate-800">작업자 정보</span>
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-bold border",
                                    worker.status === "WORKING" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        worker.status === "PAUSED" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            "bg-slate-100 text-slate-500 border-slate-200"
                                )}>
                                    {worker.status === "WORKING" ? "작업중" : worker.status === "PAUSED" ? "휴식" : "대기"}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">현재 위치</span>
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                        {worker.current_zone_id ? `Zone ${worker.current_zone_id}` : "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">금일 작업량</span>
                                    <span className="text-xs font-bold text-slate-700">
                                        {worker.today_work_count} 건
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}

                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="uppercase tracking-wide">
                        {issue.zoneName || "ZONE --"}
                    </span>
                </span>
            </div>

            {/* Right: Badge & Time */}
            <div className="flex flex-col items-end gap-1.5">
                <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border",
                    isOutOfStock
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100" // Indigo for Stock (Distinct from Warn/Busy)
                        : "bg-violet-50 text-violet-700 border-violet-100" // Violet for Broken
                )}>
                    {isOutOfStock ? "재고 부족" : "물품 파손"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                    {timeAgo(issue.created_at)}
                </span>
            </div>
        </div>
    );
}
