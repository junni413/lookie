
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
import { getUrgencyInfo } from "@/utils/issueHelpers";
import { Clock, Box, MapPin, CheckCircle2 } from "lucide-react";

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
        const { text } = getUrgencyInfo(urgency);
        
        // Refined urgency colors
        let pillClass = "bg-slate-50 text-slate-500 border-slate-100";
        if (text === "HIGH") pillClass = "bg-rose-50 text-rose-600 border-rose-100";
        else if (text === "MID") pillClass = "bg-amber-50 text-amber-600 border-amber-100";
        else if (text === "LOW") pillClass = "bg-slate-50 text-slate-400 border-slate-200";

        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", pillClass)}>
                {text}
            </span>
        );
    };

    // Helper for AI Decision
    const getAiDecisionBadge = (decision: string | undefined) => {
        if (!decision) return <span className="text-slate-300 font-medium">-</span>;

        let badgeStyle = "bg-slate-50 text-slate-500 border-slate-100";
        
        if (decision === "PASS") badgeStyle = "bg-primary/5 text-primary border-primary/20";
        else if (decision === "FAIL") badgeStyle = "bg-orange-50 text-orange-600 border-orange-100";
        else if (decision === "NEED_CHECK") badgeStyle = "bg-violet-50 text-violet-600 border-violet-100";

        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", badgeStyle)}>
                {decision}
            </span>
        );
    };

    // Dynamic column width based on tab
    const columnWidth = tab === "OPEN" ? "w-[16.66%]" : "w-[14.28%]";

    return (
        <div className="h-full overflow-hidden flex flex-col bg-white">
            <div className="overflow-auto flex-1 scrollbar-hidden relative">
                <Table className="w-full min-w-[1000px] border-collapse table-fixed">
                    {/* ... Table Content ... */}
                    <TableHeader className="sticky top-0 bg-white/95 z-10 backdrop-blur-md border-b border-slate-100">
                        {/* ... Table Header ... */}
                         <TableRow className="hover:bg-transparent border-none">
                            <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-6 text-left h-10 whitespace-nowrap", columnWidth)}>
                                발생 정보
                            </TableHead>
                            {tab === "RESOLVED" && (
                                <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                    완료 시각
                                </TableHead>
                            )}
                            <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                이슈 타입
                            </TableHead>
                            <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                AI 판정
                            </TableHead>
                            {tab === "OPEN" && (
                                <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                    긴급도
                                </TableHead>
                            )}
                            {tab === "RESOLVED" && (
                                <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                    최종 결정
                                </TableHead>
                            )}
                            <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left h-10 whitespace-nowrap", columnWidth)}>
                                담당 작업자
                            </TableHead>
                            <TableHead className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-6 text-left h-10 whitespace-nowrap", columnWidth)}>
                                상품 및 위치 정보
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issues.length > 0 && issues.map((issue) => (
                                <TableRow
                                    key={issue.issueId}
                                    className={cn(
                                        "group cursor-pointer transition-all duration-200 border-b border-slate-50",
                                        selectedId === issue.issueId 
                                            ? "bg-primary/5 hover:bg-primary/10" 
                                            : "hover:bg-slate-50/80"
                                    )}
                                    onClick={() => onSelect(issue.issueId)}
                                >
                                    {/* Created At */}
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center justify-start gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                                            <div className="flex flex-col items-start">
                                                <span className="text-[11px] font-bold text-slate-700">
                                                    {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    {new Date(issue.createdAt).toISOString().split('T')[0]} · {timeAgo(issue.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Resolved At */}
                                    {tab === "RESOLVED" && (
                                        <TableCell className="py-4 text-left">
                                            <span className="text-[11px] font-bold text-slate-600">
                                                {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Issue Type */}
                                    <TableCell className="py-4">
                                        <div className="flex justify-start">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
                                                issue.issueType === "OUT_OF_STOCK"
                                                    ? "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100/50"
                                                    : "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-100/50"
                                            )}>
                                                <Box className="w-3 h-3 opacity-70" />
                                                {issue.issueType === "OUT_OF_STOCK" ? "RE-STOCK" : "DAMAGED"}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* AI Decision */}
                                    <TableCell className="py-4">
                                        <div className="flex justify-start">
                                            {getAiDecisionBadge(issue.aiDecision)}
                                        </div>
                                    </TableCell>

                                    {/* Urgency */}
                                    {tab === "OPEN" && (
                                        <TableCell className="py-4">
                                            <div className="flex justify-start">
                                                {getUrgencyBadge(issue.urgency)}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Admin Decision */}
                                    {tab === "RESOLVED" && (
                                        <TableCell className="py-4">
                                            <div className="flex justify-start">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                                    issue.adminDecision === "NORMAL" 
                                                        ? "text-teal-600 bg-teal-50 border-teal-100" 
                                                        : "text-emerald-600 bg-emerald-50 border-emerald-100"
                                                )}>
                                                    {issue.adminDecision || "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Worker Info */}
                                    <TableCell className="py-4">
                                        <div className="flex justify-start">
                                            <WorkerHoverCard workerId={issue.workerId}>
                                                <div className="flex items-center gap-2.5 cursor-help group/worker">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-slate-700 truncate group-hover/worker:text-primary leading-tight">
                                                            {issue.workerName || "알 수 없음"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </WorkerHoverCard>
                                        </div>
                                    </TableCell>

                                    {/* Product/Zone */}
                                    <TableCell className="py-4 pr-6">
                                        <div className="flex items-center justify-start gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-300" />
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                                                    {issue.productName || "-"}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {issue.locationCode}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>

                {issues.length === 0 && (
                    <div className="absolute inset-0 top-[40px] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700 bg-white">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <CheckCircle2 className="w-10 h-10 text-primary/60" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-2">모든 이슈가 처리되었습니다</h3>
                        <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed text-center">
                            현재 관리자님이 담당하신 구역에는<br/>검토 대기 중인 이슈가 없습니다.
                        </p>
                    </div>
                )}
            </div>
            
            {/* Custom Scrollbar Style - Completely Hidden */}
            <style>{`
                .scrollbar-hidden::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
                .scrollbar-hidden {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
            `}</style>
        </div>
    );
}
