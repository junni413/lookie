
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IssueResponse } from "@/types/db";
import { cn } from "@/utils/cn";
import { ArrowUpDown } from "lucide-react";
import { timeAgo } from "@/utils/format";

interface IssueTableProps {
    issues: IssueResponse[];
    tab: "OPEN" | "RESOLVED";
    selectedId: number | null;
    onSelect: (id: number) => void;
    sortKey: "TIME" | "PRIORITY";
    onSort: (key: "TIME" | "PRIORITY") => void;
}

export default function IssueTable({
    issues,
    tab,
    selectedId,
    onSelect,
    sortKey,
    onSort,
}: IssueTableProps) {
    // Helper to format urgency
    const getUrgencyBadge = (priority: string) => {
        let color = "bg-green-100 text-green-800";
        if (priority === "HIGH") color = "bg-red-100 text-red-800";
        else if (priority === "MEDIUM") color = "bg-yellow-100 text-yellow-800";

        return (
            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", color)}>
                {priority}
            </span>
        );
    };

    // Helper for AI Decision
    const getAiDecisionBadge = (decision: string | undefined, confidence: number = 0) => {
        if (!decision) return <span className="text-gray-400">-</span>;

        // Pass/Fail etc.
        const isPass = decision === "PASS";
        return (
            <div className="flex flex-col items-start gap-0.5">
                <span className={cn("text-xs font-bold", isPass ? "text-green-600" : "text-red-600")}>
                    {decision}
                </span>
                <span className="text-[10px] text-gray-500">{(confidence * 100).toFixed(0)}%</span>
            </div>
        );
    };

    return (
        <div className="rounded-md border h-full overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary/50 z-10 backdrop-blur-sm">
                        <TableRow>
                            {/* COMMON: Created At */}
                            <TableHead className="w-[120px]">
                                <Button
                                    variant="ghost"
                                    onClick={() => onSort("TIME")}
                                    className="p-0 hover:bg-transparent font-bold text-xs"
                                >
                                    발생 시각
                                    {sortKey === "TIME" && <ArrowUpDown className="ml-2 h-3 w-3" />}
                                </Button>
                            </TableHead>

                            {/* RESOLVED ONLY: Resolved At */}
                            {tab === "RESOLVED" && <TableHead className="w-[120px]">완료 시각</TableHead>}

                            {/* COMMON: Issue Type */}
                            <TableHead>이슈 타입</TableHead>

                            {/* COMMON: AI Decision */}
                            <TableHead>AI 판정</TableHead>

                            {/* OPEN ONLY: Urgency (Sortable) */}
                            {tab === "OPEN" && (
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onSort("PRIORITY")}
                                        className="p-0 hover:bg-transparent font-bold text-xs"
                                    >
                                        긴급도
                                        {sortKey === "PRIORITY" && <ArrowUpDown className="ml-2 h-3 w-3" />}
                                    </Button>
                                </TableHead>
                            )}

                            {/* RESOLVED ONLY: Admin Decision */}
                            {tab === "RESOLVED" && <TableHead>최종 결정</TableHead>}


                            {/* WORKER INFO */}
                            <TableHead>{tab === "OPEN" ? "작업자 (연락처)" : "작업자 ID"}</TableHead>

                            {/* COMMON: Product (Using Zone as proxy or if product exists) */}
                            <TableHead>상품 (구역)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issues.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={tab === "OPEN" ? 6 : 7} className="h-24 text-center">
                                    데이터가 없습니다.
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
                                        <Badge variant={issue.issueType === "OUT_OF_STOCK" ? "secondary" : "destructive"} className="text-[10px]">
                                            {issue.issueType === "OUT_OF_STOCK" ? "재고 부족" : "파손 감지"}
                                        </Badge>
                                    </TableCell>

                                    {/* AI Decision */}
                                    <TableCell>
                                        {getAiDecisionBadge(issue.judgment?.aiDecision, issue.judgment?.confidence || 0)}
                                    </TableCell>

                                    {/* Urgency */}
                                    {tab === "OPEN" && (
                                        <TableCell>
                                            {getUrgencyBadge(issue.priority)}
                                        </TableCell>
                                    )}

                                    {/* Admin Decision */}
                                    {tab === "RESOLVED" && (
                                        <TableCell className="text-xs font-bold">
                                            {issue.requiredAction === "WORKER_CONTINUE" ? "정상 승인" : "폐기/조치"}
                                        </TableCell>
                                    )}

                                    {/* Worker Info */}
                                    <TableCell className="text-xs">
                                        {tab === "OPEN" ? (
                                            <div>
                                                <div className="font-bold">{issue.workerName}</div>
                                                <div className="text-[10px] text-gray-500">010-XXXX-{(issue.workerId % 10000).toString().padStart(4, '0')}</div>
                                            </div>
                                        ) : (
                                            <div className="font-mono text-gray-600">ID: {issue.workerId}</div>
                                        )}
                                    </TableCell>

                                    {/* Product/Zone */}
                                    <TableCell className="text-xs">
                                        {/* Assuming product name is not in IssueResponse yet, using Zone for now */}
                                        <div className="font-medium text-gray-700">{issue.zoneName}</div>
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
