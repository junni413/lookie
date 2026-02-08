import type { IssueResponse } from "@/types/db";
import type { AdminIssueSummary } from "@/types/issue";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";
import WorkerHoverCard from "../common/WorkerHoverCard";
import { getUrgencyInfo } from "@/utils/issueHelpers";
import { Box } from "lucide-react";

// Define a union type for the issue prop
type IssueItem = IssueResponse | AdminIssueSummary;

interface IssueListItemProps {
    issue: IssueItem;
    selected?: boolean;
    onClick?: () => void;
}

export default function IssueListItem({ issue, selected, onClick }: IssueListItemProps) {
    // Safe property access
    const locationDisplay = (issue as AdminIssueSummary).locationCode || (issue as IssueResponse).zoneName || "-";
    const productDisplay = (issue as AdminIssueSummary).productName || "-";
    
    // Urgency/Priority Logic
    const urgencyVal = (issue as AdminIssueSummary).urgency;
    const priorityVal = (issue as IssueResponse).priority;

    let badgeText = "LOW";
    let badgeClass = "bg-slate-50 text-slate-500 border-slate-100"; // Default (Low/Unknown)

    if (urgencyVal !== undefined) {
         const info = getUrgencyInfo(urgencyVal);
         badgeText = info.text;
         
         // Match IssueTable colors
         if (badgeText === "HIGH") badgeClass = "bg-rose-50 text-rose-600 border-rose-100";
         else if (badgeText === "MID") badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
         else if (badgeText === "LOW") badgeClass = "bg-slate-50 text-slate-400 border-slate-200";

    } else if (priorityVal) {
        // Fallback for IssueResponse type if needed (though dashboard mostly uses AdminIssueSummary now? 
        // actually Dashboard uses issueService.getIssues which returns AdminIssueSummary, so likely covered.
        // But keeping fallback just in case)
        badgeText = priorityVal;
        if (priorityVal === "HIGH") badgeClass = "bg-rose-50 text-rose-600 border-rose-100";
        else if (priorityVal === "MEDIUM") badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
        else badgeClass = "bg-slate-50 text-slate-400 border-slate-200";
    }

    const issueType = issue.issueType;

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-5 py-3 rounded-2xl cursor-pointer border",
                selected
                    ? "bg-blue-50/50 border-blue-100 shadow-sm"
                    : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/80 transition-all duration-200"
            )}>
            {/* Left: Worker & Zone */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
                {/* Worker Name with Hover Card */}
                <div className="flex items-center gap-2">
                    <WorkerHoverCard workerId={issue.workerId}>
                        <span className="font-bold text-slate-700 text-[13px] leading-tight hover:text-blue-600 transition-colors cursor-help truncate">
                            {issue.workerName || "작업자"}
                        </span>
                    </WorkerHoverCard>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    <span className="text-slate-600 font-semibold">{locationDisplay}</span>
                    <span className="text-slate-300">|</span>
                    <span className="truncate max-w-[120px]" title={productDisplay}>{productDisplay}</span>
                </div>
            </div>

            {/* Right: Badge & Time */}
            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                <div className="flex items-center gap-1.5">
                    {/* Urgency Badge */}
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        badgeClass
                    )}>
                        {badgeText}
                    </span>
                    
                    {/* Issue Type Badge (Match IssueTable) */}
                    <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
                        issueType === "OUT_OF_STOCK"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                        <Box className="w-3 h-3 opacity-70" />
                        {issueType === "OUT_OF_STOCK" ? "RE-STOCK" : "DAMAGED"}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                    {timeAgo(issue.createdAt)}
                </span>
            </div>
        </div>
    );
}
