import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import { issueService } from "@/services/issueService";
import type { AdminIssueSummary, IssueStatus, IssueSortType } from "@/types/issue";
import IssueTable from "./components/issue/IssueTable";
import IssueDetail from "./components/issue/IssueDetail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { 
    Clock, 
    AlertTriangle, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown
} from "lucide-react";


// Custom Dropdown Component
function PageSizeDropdown({ value, onChange }: { value: number; onChange: (val: number) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [10, 15, 20];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 pl-3 pr-2.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
                <span>{value}개</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => {
                                onChange(option);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full px-3 py-2 text-left text-[11px] font-bold transition-colors",
                                value === option 
                                    ? "text-primary bg-primary/5" 
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {option}개
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}


export default function Issue() {
    const [searchParams] = useSearchParams();
    // State
    const [currentTab, setCurrentTab] = useState<IssueStatus>("OPEN");
    const [sortType, setSortType] = useState<IssueSortType>("LATEST");
    const [issues, setIssues] = useState<AdminIssueSummary[]>([]);
    // Initialize selectedId from URL if present
    const [selectedId, setSelectedId] = useState<number | null>(() => {
        const qId = searchParams.get("issueId");
        return qId ? parseInt(qId) : null;
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [totalCount, setTotalCount] = useState(0);

    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        // Also update selectedId if URL changes while mounted (optional, but good for deeplinks)
        const qId = searchParams.get("issueId");
        if (qId) {
            const pId = parseInt(qId);
            if (!isNaN(pId)) setSelectedId(pId);
        }
        return () => { isMountedRef.current = false; };
    }, [searchParams]);

    // Fetch Issues
    const fetchIssues = useCallback(async () => {
        try {
            const result = await issueService.getIssues({
                page,
                size: pageSize,
                status: currentTab,
                sortType: sortType
            });

            if (isMountedRef.current) {
                setIssues(result.issues);
                setTotalCount(result.paging.total);
            }
        } catch (error) {
            console.error("Failed to fetch issues", error);
        }
    }, [page, pageSize, currentTab, sortType]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    // Handle Tab Change
    const handleTabChange = (tab: IssueStatus) => {
        setCurrentTab(tab);
        setPage(1);
        setSelectedId(null);
    };

    const handleSortChange = (sort: IssueSortType) => {
        setSortType(sort);
        setPage(1);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            <AdminPageHeader
                title="이슈 관리"
                description="작업자가 요청한 판정 내역을 검토하고 처리합니다."
            />

            <div className="flex-1 px-8 pb-6 min-h-0 flex gap-4 overflow-hidden">
                {/* Main List Area - Resizes when split */}
                <Card className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out border-0 shadow-sm border rounded-xl overflow-hidden",
                    selectedId ? "w-1/2" : "w-full"
                )}>
                    {/* Header: Tabs & Controls (Single Row) */}
                    <div className="flex items-center justify-between p-5 border-b shrink-0 bg-white">
                        {/* Left: Main Navigation Tabs (Sliding Animation) */}
                        <div className="relative flex items-center bg-slate-100/80 p-1 rounded-full">
                            {(["OPEN", "RESOLVED"] as const).map((tab) => {
                                const isActive = currentTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabChange(tab)}
                                        className={cn(
                                            "relative z-10 flex items-center justify-center h-8 px-5 rounded-full text-[13px] font-bold transition-colors duration-200",
                                            isActive ? "text-primary" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{tab === "OPEN" ? "승인 대기" : "승인 완료"}</span>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Right: Filter & Sort Controls */}
                        <div className="flex items-center gap-3">
                            {/* Sort Type Toggle - Show only in OPEN tab */}
                            {currentTab === "OPEN" && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-[11px] font-bold rounded-full px-3.5 flex items-center gap-1.5 transition-all duration-200 border",
                                            sortType === "LATEST" 
                                                ? "bg-primary/5 border-primary/20 text-primary" 
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                        )}
                                        onClick={() => handleSortChange("LATEST")}
                                    >
                                        <Clock className={cn("w-3.5 h-3.5", sortType === "LATEST" ? "text-primary" : "text-slate-400")} />
                                        최신순
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-[11px] font-bold rounded-full px-3.5 flex items-center gap-1.5 transition-all duration-200 border",
                                            sortType === "URGENCY" 
                                                ? "bg-red-50/50 border-red-100 text-red-600" 
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                        )}
                                        onClick={() => handleSortChange("URGENCY")}
                                    >
                                        <AlertTriangle className={cn("w-3.5 h-3.5", sortType === "URGENCY" ? "text-red-500" : "text-slate-400")} />
                                        긴급순
                                    </Button>
                                </div>
                            )}

                            {/* Page Size Toggle (Custom Dropdown) */}
                            <PageSizeDropdown value={pageSize} onChange={setPageSize} />
                        </div>
                    </div>

                    {/* Content: Table */}
                    <div className="flex-1 overflow-hidden p-0 bg-muted/5 relative">
                        <IssueTable
                            issues={issues}
                            tab={currentTab}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                        />
                    </div>

                    {/* Footer: Pagination */}
                    <div className="px-6 py-4 border-t bg-white shrink-0 flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Showing <span className="text-slate-900">{issues.length}</span> of <span className="text-slate-900">{totalCount}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1.5 mx-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                                    {page}
                                </div>
                                {page * pageSize < totalCount && (
                                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-[11px] font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setPage(p => p + 1)}>
                                        {page + 1}
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * pageSize >= totalCount}
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
                        /* 
                           Note: IssueDetail fetches data independently based on issueId. 
                           This guarantees correct display even if the issue is not present 
                           in the current paginated list (Deep Linking support).
                        */
                        <IssueDetail
                            issueId={selectedId}
                            initialWorkerId={issues.find(i => i.issueId === selectedId)?.workerId}
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
