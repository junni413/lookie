import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { adminService, type WorkerHoverInfo } from "@/services/adminService";
import { cn } from "@/utils/cn";
import { Siren } from "lucide-react";

interface WorkerHoverCardProps {
    workerId: number | null | undefined;
    children: React.ReactNode;
    className?: string; // Class for the trigger wrapper
}

export default function WorkerHoverCard({ workerId, children, className }: WorkerHoverCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<WorkerHoverInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (!workerId) return;
        
        // Delay opening to prevent flickering on quick mouse movements
        timeoutRef.current = setTimeout(() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if(!rect) return;

            // Viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            const cardWidth = 280; // slightly wider than 260 for safety
            const estimatedHeight = 300; // conservative estimate

            let left = rect.right + 10;
            let top = rect.top;
            let transform = '';

            // Horizontal Collision Check
            // Default: Right side of trigger
            // If overflow on right, check left side
            if (rect.right + cardWidth + 20 > viewportWidth) {
                left = rect.left - cardWidth - 10;
            }
            // If left is too small (overflow on left), clamp it
            if (left < 10) {
                left = 10;
            }

            // Vertical Collision Check
            // Default: Top aligned with trigger
            // If bottom overflow, align bottom of card with bottom of trigger
            const spaceBelow = viewportHeight - rect.top;
            if (spaceBelow < estimatedHeight) {
                // Not enough space below, align bottom
                top = rect.bottom;
                transform = 'translateY(-100%)';
            } else {
                // Default: Top aligned
                top = rect.top;
                transform = 'none';
            }

            setStyle({
                top,
                left,
                transform
            });

            setIsOpen(true);
            fetchData();
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
                    className="fixed z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none" 
                    style={style}
                >
                    <div className="w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-5 flex flex-col gap-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="flex justify-between items-center">
                                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                                    <div className="h-4 bg-slate-100 rounded-full w-8" />
                                </div>
                                <div className="h-px bg-slate-100 w-full my-2" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                        <div className="h-5 bg-slate-100 rounded w-3/4" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                        <div className="h-5 bg-slate-100 rounded w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ) : data ? (
                            <>
                                {/* Header: Name & Status */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-slate-800 text-base tracking-tight">
                                            {data.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100/50 rounded-full">
                                            <span className={`w-1.5 h-1.5 rounded-full ${data.currentLocationCode ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]'}`} />
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {data.currentLocationCode ? "작업 중" : "위치 미상"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-slate-100 w-full mb-1" />

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                                            TODAY WORK
                                        </p>
                                        <p className="text-xl font-bold text-slate-700 leading-none">
                                            {data.todayWorkCount}
                                            <span className="text-xs font-medium text-slate-400 ml-1">건</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                                            LOCATION
                                        </p>
                                        <p className="text-base font-bold text-slate-700 leading-tight">
                                            {data.currentLocationCode || "-"}
                                        </p>
                                    </div>
                                </div>

                                {/* Modern Issue Alert */}
                                {data.recentIssueType && (
                                    <div className={`mt-1 rounded-xl border overflow-hidden ${
                                        data.recentIssueType === 'OUT_OF_STOCK' 
                                            ? 'bg-amber-50/50 border-amber-100/50' 
                                            : 'bg-rose-50/50 border-rose-100/50'
                                    }`}>
                                        <div className={`px-3 py-2 flex items-center gap-1.5 border-b ${
                                            data.recentIssueType === 'OUT_OF_STOCK' ? 'border-amber-100/50 bg-amber-100/20' : 'border-rose-100/50 bg-rose-100/20'
                                        }`}>
                                            <Siren className={`w-3.5 h-3.5 ${
                                                data.recentIssueType === 'OUT_OF_STOCK' ? 'text-amber-600' : 'text-rose-600'
                                            }`} />
                                            <span className={`text-[10px] font-bold ${
                                                data.recentIssueType === 'OUT_OF_STOCK' ? 'text-amber-700' : 'text-rose-700'
                                            }`}>
                                                최근 신고된 이슈
                                            </span>
                                        </div>
                                        
                                        <div className="p-3">
                                            <p className={`text-xs font-bold mb-0.5 ${
                                                data.recentIssueType === 'OUT_OF_STOCK' ? 'text-amber-900' : 'text-rose-900'
                                            }`}>
                                                {data.recentIssueType === "OUT_OF_STOCK" ? "재고 부족" : "물품 파손"}
                                            </p>
                                            <p className={`text-[10px] leading-relaxed ${
                                                data.recentIssueType === 'OUT_OF_STOCK' ? 'text-amber-700/80' : 'text-rose-700/80'
                                            }`}>
                                                {data.recentIssueType === "OUT_OF_STOCK" 
                                                    ? "재고 부족 이슈를 신고하였습니다." 
                                                    : "물품 파손 이슈를 신고하였습니다."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-slate-400 text-center py-2">정보를 불러올 수 없습니다.</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
