import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { adminService, type WorkerHoverInfo } from "@/services/adminService";
import { cn } from "@/utils/cn";

interface WorkerHoverCardProps {
    workerId: number | null | undefined;
    children: React.ReactNode;
    className?: string; // Class for the trigger wrapper
}

export default function WorkerHoverCard({ workerId, children, className }: WorkerHoverCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<WorkerHoverInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (!workerId) return;
        
        // Delay opening to prevent flickering on quick mouse movements
        timeoutRef.current = setTimeout(() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) {
                // Position logic: defaults to top-right of the trigger
                setPosition({
                    top: rect.top + window.scrollY, // Align with top
                    left: rect.right + 10,          // Offset to right
                });
                setIsOpen(true);
                fetchData();
            }
        }, 300); // 300ms delay
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(false);
    };

    const fetchData = async () => {
        if (data || !workerId) return; // Cache: Fetch once per mount/workerId
        setLoading(true);
        try {
            const result = await adminService.getWorkerHoverInfo(workerId);
            setData(result);
        } catch (error) {
            console.error("Failed to fetch worker hover info", error);
        } finally {
            setLoading(false);
        }
    };

    if (!workerId) return <>{children}</>;

    return (
        <div 
            ref={triggerRef}
            className={cn("inline-block", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && createPortal(
                <div 
                    className="fixed z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none" // pointer-events-none to prevent interfering with mouse
                    style={{ 
                        top: position.top, 
                        left: position.left,
                        transform: 'translateY(-20%)' // Slightly shift up for better visibility
                    }}
                >
                    <div className="w-64 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden">
                        {/* Header pattern */}
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                        
                        <div className="p-4">
                            {loading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                </div>
                            ) : data ? (
                                <div className="space-y-4">
                                    {/* Header: Name & ID */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                {data.name}
                                                <span className="text-[10px] text-slate-400 font-normal ml-0.5">#{data.workerId}</span>
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {data.currentZoneName || "구역 정보 없음"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100/50">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-medium text-slate-400">금일 작업</span>
                                            <span className="text-sm font-bold text-slate-700">{data.todayWorkCount}건</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-medium text-slate-400">현재 위치</span>
                                            <span className="text-sm font-bold text-slate-700">{data.currentLocationCode || "-"}</span>
                                        </div>
                                    </div>

                                    {/* Recent Issue */}
                                    {data.recentIssueType && (
                                        <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-md border border-rose-100">
                                            <div className="w-1 h-8 bg-rose-400 rounded-full" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-rose-700 uppercase">Latest Issue</span>
                                                <span className="text-xs font-medium text-rose-600">
                                                    {data.recentIssueType === "OUT_OF_STOCK" ? "재고 부족" : "물품 파손"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 text-center py-2">정보를 불러올 수 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
