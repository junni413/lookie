
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminIssueSummary, IssueStatus } from "@/types/issue";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

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
        let color = "bg-green-100 text-green-800";
        if (urgency <= 2) color = "bg-red-100 text-red-800";
        else if (urgency <= 4) color = "bg-yellow-100 text-yellow-800";

        return (
            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", color)}>
                {urgency <= 2 ? "높음" : urgency <= 4 ? "중간" : "낮음"}
            </span>
        );
    };

    // Helper for AI Decision
    const getAiDecisionBadge = (decision: string | undefined) => {
        if (!decision) return <span className="text-gray-400">-</span>;

        // Pass/Fail etc.
        const isPass = decision === "PASS";
        const isUnknown = decision === "UNKNOWN";
        const color = isPass ? "text-green-600" : isUnknown ? "text-gray-500" : "text-red-600";

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
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary/50 z-10 backdrop-blur-sm">
                        <TableRow>
                            {/* COMMON: Created At */}
                            <TableHead className="w-[120px]">
                                발생 시각
                            </TableHead>

                            {/* RESOLVED ONLY: Resolved At */}
                            {tab === "RESOLVED" && <TableHead className="w-[120px]">완료 시각</TableHead>}

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
                            <TableHead>{tab === "OPEN" ? "작업자" : "작업자 ID"}</TableHead>

                            {/* COMMON: Product / Zone */}
                            <TableHead>상품 (위치)</TableHead>
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
                                        {tab === "OPEN" ? (
                                            <div>
                                                <div className="font-bold">{issue.workerName}</div>
                                            </div>
                                        ) : (
                                            <div className="font-mono text-gray-600">ID: {issue.workerId}</div>
                                        )}
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
