import { useEffect, useState, useRef, useCallback } from "react";
import { issueService } from "@/services/issueService";
import type { IssueResponse } from "@/types/db";
import IssueList from "./components/issue/IssueList";
import IssueDetail from "./components/issue/IssueDetail";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";

const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function Issue() {
    const [issues, setIssues] = useState<IssueResponse[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [listSortKey, setListSortKey] = useState<"TIME" | "PRIORITY">("TIME");

    // Track mounted state for async safety
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Consolidated fetch function
    const fetchIssues = useCallback(async () => {
        try {
            const data = await issueService.getIssues();
            if (isMountedRef.current) {
                setIssues(data);
            }
        } catch (error) {
            console.error("Failed to fetch issues", error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    const openIssues = issues.filter(i => i.status === "OPEN");
    const resolvedIssues = issues.filter(i => i.status === "RESOLVED");

    const sortedOpen = [...openIssues].sort((a, b) => {
        if (listSortKey === "TIME") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return priorityMap[b.priority] - priorityMap[a.priority];
    });

    const sortedResolved = [...resolvedIssues].sort((a, b) => {
        const timeA = a.resolved_at ? new Date(a.resolved_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.resolved_at ? new Date(b.resolved_at).getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
    });

    const selectedIssue = issues.find((i) => i.issue_id === selectedId) || null;

    const showDetailOnLeft = selectedIssue && selectedIssue.status === "RESOLVED";
    const showDetailOnRight = selectedIssue && selectedIssue.status === "OPEN";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-theme(spacing.24))]">
            {/* LEFT COLUMN: Open List OR Resolved Detail */}
            <section className="col-span-1 h-full">
                {showDetailOnLeft ? (
                    <IssueDetail
                        issue={selectedIssue}
                        onUpdate={() => {
                            fetchIssues();
                        }}
                        onClose={() => setSelectedId(null)}
                    />
                ) : (
                    <div className="flex flex-col h-full bg-card rounded-xl shadow-sm border overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b shrink-0">
                            <h2 className="text-xl font-bold">판정 요청 목록</h2>
                            <div className="flex bg-muted rounded-lg p-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-7 px-3 text-xs", listSortKey === "TIME" && "bg-background shadow-sm")}
                                    onClick={() => setListSortKey("TIME")}
                                >
                                    시간순
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-7 px-3 text-xs", listSortKey === "PRIORITY" && "bg-background shadow-sm")}
                                    onClick={() => setListSortKey("PRIORITY")}
                                >
                                    긴급도순
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                            <IssueList
                                issues={sortedOpen}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* RIGHT COLUMN: Resolved List OR Open Detail */}
            <section className="col-span-1 h-full">
                {showDetailOnRight ? (
                    <IssueDetail
                        issue={selectedIssue}
                        onUpdate={() => {
                            fetchIssues();
                            setSelectedId(null);
                        }}
                        onClose={() => setSelectedId(null)}
                    />
                ) : (
                    <Card className="h-full border-0 shadow-sm border rounded-xl flex flex-col overflow-hidden">
                        <CardHeader className="p-6 border-b shrink-0">
                            <CardTitle className="text-xl">처리 완료 목록</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/10">
                            <IssueList
                                issues={sortedResolved}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        </CardContent>
                    </Card>
                )}
            </section>
        </div>
    );
}
