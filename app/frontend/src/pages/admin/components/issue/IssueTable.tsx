
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { AdminIssueSummary, IssueStatus } from "@/types/issue";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";
import WorkerHoverCard from "../common/WorkerHoverCard";
import { getUrgencyInfo, getAiDecisionColor } from "@/utils/issueHelpers";

interface IssueTableProps {
    issues: AdminIssueSummary[];
    tab: IssueStatus;
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export default function IssueTable({
    issues,
    tab,
    selectedId,
    onSelect,
}: IssueTableProps) {
    // Helper to format urgency (1: High ~ 5: Low)
    const getUrgencyBadge = (urgency: number) => {
        const { text, className } = getUrgencyInfo(urgency);

        return (
            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", className)}>
                {text}
            </span>
        );
    };

    // Helper for AI Decision
    const getAiDecisionBadge = (decision: string | undefined) => {
        if (!decision) return <span className="text-gray-400">-</span>;

        const color = getAiDecisionColor(decision);

        return (
            <div className="flex flex-col items-start gap-0.5">
                <span className={cn("text-xs font-bold", color)}>
                    {decision}
                </span>
            </div>
        );
    };

    return (
        <div className="rounded-md border h-full overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <Table className="table-fixed w-full">
                    <TableHeader className="sticky top-0 bg-secondary/50 z-10 backdrop-blur-sm">
                        <TableRow>
                            {/* COMMON: Created At */}
                            <TableHead>
                                발생 시각
                            </TableHead>

                            {/* RESOLVED ONLY: Resolved At */}
                            {tab === "RESOLVED" && <TableHead>완료 시각</TableHead>}

                            {/* COMMON: Issue Type */}
                            <TableHead>이슈 타입</TableHead>

                            {/* COMMON: AI Decision */}
                            <TableHead>AI 판정</TableHead>

                            {/* OPEN ONLY: Urgency */}
                            {tab === "OPEN" && (
                                <TableHead>긴급도</TableHead>
                            )}

                            {/* RESOLVED ONLY: Admin Decision */}
                            {tab === "RESOLVED" && <TableHead>최종 결정</TableHead>}


                            {/* WORKER INFO */}
                            <TableHead>작업자</TableHead>

                            {/* COMMON: Product / Zone */}
                            <TableHead>상품 (위치)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issues.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={tab === "OPEN" ? 6 : 7} className="h-96 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center text-slate-500 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-base font-medium text-slate-600">현재 관리자가 담당한 구역에는</p>
                                        <p className="text-sm text-slate-500 mt-1">처리해야 할 이슈가 없습니다.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            issues.map((issue) => (
                                <TableRow
                                    key={issue.issueId}
                                    className={cn(
                                        "cursor-pointer hover:bg-muted/50 transition-colors",
                                        selectedId === issue.issueId && "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500"
                                    )}
                                    onClick={() => onSelect(issue.issueId)}
                                >
                                    {/* Created At */}
                                    <TableCell className="text-xs font-medium">
                                        {new Date(issue.createdAt).toLocaleTimeString()}
                                        <div className="text-[10px] text-gray-400">{timeAgo(issue.createdAt)}</div>
                                    </TableCell>

                                    {/* Resolved At */}
                                    {tab === "RESOLVED" && (
                                        <TableCell className="text-xs font-medium">
                                            {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleTimeString() : "-"}
                                        </TableCell>
                                    )}

                                    {/* Issue Type */}
                                    <TableCell>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                                            issue.issueType === "OUT_OF_STOCK"
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>
                                            {issue.issueType === "OUT_OF_STOCK" ? "재고" : "파손"}
                                        </span>
                                    </TableCell>

                                    {/* AI Decision */}
                                    <TableCell>
                                        {getAiDecisionBadge(issue.aiDecision)}
                                    </TableCell>

                                    {/* Urgency */}
                                    {tab === "OPEN" && (
                                        <TableCell>
                                            {getUrgencyBadge(issue.urgency)}
                                        </TableCell>
                                    )}

                                    {/* Admin Decision */}
                                    {tab === "RESOLVED" && (
                                        <TableCell className="text-xs font-bold">
                                            {issue.adminDecision || "-"}
                                        </TableCell>
                                    )}

                                    {/* Worker Info */}
                                    <TableCell className="text-xs">
                                        <WorkerHoverCard workerId={issue.workerId}>
                                            <div className="font-bold hover:text-blue-600 transition-colors cursor-help inline-block">
                                                {issue.workerName || "알 수 없음"}
                                            </div>
                                        </WorkerHoverCard>
                                    </TableCell>

                                    {/* Product/Zone */}
                                    <TableCell className="text-xs">
                                        <div className="font-medium text-gray-700">{issue.productName || "-"}</div>
                                        <div className="text-[10px] text-gray-500">{issue.locationCode}</div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
