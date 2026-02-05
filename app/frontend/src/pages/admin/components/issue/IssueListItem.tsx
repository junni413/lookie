import type { IssueResponse } from "@/types/db";
import type { AdminIssueSummary } from "@/types/issue";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";
import WorkerHoverCard from "../common/WorkerHoverCard";
import { getUrgencyInfo } from "@/utils/issueHelpers";

// Define a union type for the issue prop
type IssueItem = IssueResponse | AdminIssueSummary;

interface IssueListItemProps {
    issue: IssueItem;
    selected?: boolean;
    onClick?: () => void;
}

export default function IssueListItem({ issue, selected, onClick }: IssueListItemProps) {
    const isOutOfStock = issue.issueType === "OUT_OF_STOCK";

    // Safe property access
    const locationDisplay = (issue as AdminIssueSummary).locationCode || (issue as IssueResponse).zoneName || "-";
    const productDisplay = (issue as AdminIssueSummary).productName || "-";
    
    // Urgency/Priority Logic
    const urgencyVal = (issue as AdminIssueSummary).urgency;
    const priorityVal = (issue as IssueResponse).priority;

    let badgeText = "LOW";
    let badgeClass = "bg-green-100 text-green-800";

    if (urgencyVal !== undefined) {
         const info = getUrgencyInfo(urgencyVal);
         badgeText = info.text;
         badgeClass = info.className;
    } else if (priorityVal) {
        badgeText = priorityVal;
        if (priorityVal === "HIGH") badgeClass = "bg-red-100 text-red-800";
        else if (priorityVal === "MEDIUM") badgeClass = "bg-yellow-100 text-yellow-800";
    }

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
                {/* Worker Name with Hover Card */}
                <WorkerHoverCard workerId={issue.workerId}>
                    <span className="font-bold text-slate-800 text-sm leading-tight hover:text-blue-600 transition-colors cursor-help">
                        {issue.workerName || "작업자"}
                    </span>
                </WorkerHoverCard>

                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="uppercase tracking-wide">
                        {locationDisplay} <span className="text-slate-300">|</span> {productDisplay}
                    </span>
                </span>
            </div>

            {/* Right: Badge & Time */}
            <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                    {/* Urgency Badge */}
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        badgeClass
                    )}>
                        {badgeText}
                    </span>
                    
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border",
                        isOutOfStock
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100" // Indigo for Stock
                            : "bg-rose-50 text-rose-700 border-rose-200" // Rose for Broken
                    )}>
                        {isOutOfStock ? "재고" : "파손"}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                    {timeAgo(issue.createdAt)}
                </span>
            </div>
        </div>
    );
}
