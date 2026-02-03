import { useEffect, useState, useRef, useCallback } from "react";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import { issueService } from "@/services/issueService";
import type { IssueResponse } from "@/types/db";
import IssueTable from "./components/issue/IssueTable"; // New Table Component
import IssueDetail from "./components/issue/IssueDetail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { ChevronRight, ChevronLeft, RefreshCcw } from "lucide-react";

export default function Issue() {
    // State
    const [currentTab, setCurrentTab] = useState<"OPEN" | "RESOLVED">("OPEN");
    const [issues, setIssues] = useState<IssueResponse[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortKey, setSortKey] = useState<"TIME" | "PRIORITY">("TIME");
    const [totalCount, setTotalCount] = useState(0);

    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Fetch Issues
    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const result = await issueService.getIssues({
                page,
                size: pageSize,
                status: currentTab,
                sort: sortKey
            });

            if (isMountedRef.current) {
                setIssues(result.data);
                setTotalCount(result.total);
            }
        } catch (error) {
            console.error("Failed to fetch issues", error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [page, pageSize, currentTab, sortKey]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    // Handle Tab Change
    const handleTabChange = (tab: "OPEN" | "RESOLVED") => {
        setCurrentTab(tab);
        setPage(1);
        setSelectedId(null);
        // Default sort for RESOLVED is TIME (implicit), but we can reset sort key if needed
        if (tab === "RESOLVED") setSortKey("TIME");
    };

    // Handle Selection
    const selectedIssue = issues.find((i) => i.issue_id === selectedId) || null;

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            <AdminPageHeader
                title="이슈 관리"
                description="작업자가 요청한 판정 내역을 검토하고 처리합니다."
            />

            <div className="flex-1 p-6 min-h-0 flex gap-6 overflow-hidden">
                {/* Main List Area - Resizes when split */}
                <Card className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out border-0 shadow-sm border rounded-xl overflow-hidden",
                    selectedId ? "w-1/2" : "w-full"
                )}>
                    {/* Header: Tabs & Controls */}
                    <div className="flex items-center justify-between p-4 border-b shrink-0 bg-card">
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-8 text-xs font-semibold rounded-md", currentTab === "OPEN" && "bg-white shadow-sm text-primary")}
                                onClick={() => handleTabChange("OPEN")}
                            >
                                승인 대기
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-8 text-xs font-semibold rounded-md", currentTab === "RESOLVED" && "bg-white shadow-sm text-primary")}
                                onClick={() => handleTabChange("RESOLVED")}
                            >
                                승인 완료
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Page Size Toggle */}
                            <div className="flex items-center border rounded-md overflow-hidden h-8">
                                <button
                                    className={cn("px-3 text-xs h-full font-medium transition-colors hover:bg-muted", pageSize === 10 ? "bg-muted text-foreground" : "text-muted-foreground")}
                                    onClick={() => setPageSize(10)}
                                >
                                    10개
                                </button>
                                <div className="w-[1px] h-4 bg-border"></div>
                                <button
                                    className={cn("px-3 text-xs h-full font-medium transition-colors hover:bg-muted", pageSize === 20 ? "bg-muted text-foreground" : "text-muted-foreground")}
                                    onClick={() => setPageSize(20)}
                                >
                                    20개
                                </button>
                            </div>

                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchIssues()}>
                                <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Content: Table */}
                    <div className="flex-1 overflow-hidden p-0 bg-muted/5 relative">
                        <IssueTable
                            issues={issues}
                            tab={currentTab}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            sortKey={sortKey}
                            onSort={setSortKey}
                        />
                    </div>

                    {/* Footer: Pagination */}
                    <div className="p-3 border-t bg-card shrink-0 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            총 {totalCount}개 중 {issues.length}개 표시
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-medium w-8 text-center">{page}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setPage(p => p + 1)}
                                disabled={issues.length < pageSize} // Simple check, ideally check against total
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Split View: Detail Area */}
                <div className={cn(
                    "transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
                    selectedId ? "w-1/2 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-10 pointer-events-none absolute right-6 h-[calc(100%-3rem)]"
                )}>
                    {selectedId && (
                        <IssueDetail
                            issue={selectedIssue}
                            onUpdate={() => {
                                fetchIssues();
                                setSelectedId(null);
                            }}
                            onClose={() => setSelectedId(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
