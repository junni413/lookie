import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Siren } from "lucide-react";
import { adminService, type WorkerHoverInfo } from "@/services/adminService";
import { cn } from "@/utils/cn";

interface WorkerHoverCardProps {
    workerId: number | null | undefined;
    children: React.ReactNode;
    className?: string;
    allowCardHover?: boolean;
}

export default function WorkerHoverCard({
    workerId,
    children,
    className,
    allowCardHover = false,
}: WorkerHoverCardProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<WorkerHoverInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const triggerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const isTriggerHoveredRef = useRef(false);
    const isCardHoveredRef = useRef(false);
    const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = () => {
        if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
        }
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const scheduleClose = (delay = 120) => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
            if (!isTriggerHoveredRef.current && !isCardHoveredRef.current) {
                setIsOpen(false);
            }
        }, delay);
    };

    const fetchData = async () => {
        if (!workerId || data) return;
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

    const handleMouseEnter = () => {
        if (!workerId) return;
        isTriggerHoveredRef.current = true;
        clearTimers();

        openTimeoutRef.current = setTimeout(() => {
            if (!isTriggerHoveredRef.current && !isCardHoveredRef.current) return;

            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const cardWidth = 280;
            const estimatedHeight = 300;

            let left = rect.right + 10;
            let top = rect.top;
            let transform = "none";

            if (rect.right + cardWidth + 20 > viewportWidth) left = rect.left - cardWidth - 10;
            if (left < 10) left = 10;
            if (viewportHeight - rect.top < estimatedHeight) {
                top = rect.bottom;
                transform = "translateY(-100%)";
            }

            setStyle({ top, left, transform });
            setIsOpen(true);
            fetchData();
        }, 300);
    };

    const handleTriggerLeave = () => {
        isTriggerHoveredRef.current = false;
        clearTimers();
        scheduleClose(allowCardHover ? 180 : 0);
    };

    const handleCardEnter = () => {
        isCardHoveredRef.current = true;
        clearTimers();
    };

    const handleCardLeave = () => {
        isCardHoveredRef.current = false;
        scheduleClose(80);
    };

    useEffect(() => {
        return () => clearTimers();
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const closeIfOutside = (event: Event) => {
            const target = event.target as Node | null;
            if (!target) return;

            if (triggerRef.current?.contains(target)) return;
            if (cardRef.current?.contains(target)) return;

            isTriggerHoveredRef.current = false;
            isCardHoveredRef.current = false;
            setIsOpen(false);
        };

        const closeOnViewportChange = () => {
            isTriggerHoveredRef.current = false;
            isCardHoveredRef.current = false;
            setIsOpen(false);
        };

        document.addEventListener("pointerdown", closeIfOutside, true);
        window.addEventListener("scroll", closeOnViewportChange, true);
        window.addEventListener("resize", closeOnViewportChange);
        window.addEventListener("blur", closeOnViewportChange);

        return () => {
            document.removeEventListener("pointerdown", closeIfOutside, true);
            window.removeEventListener("scroll", closeOnViewportChange, true);
            window.removeEventListener("resize", closeOnViewportChange);
            window.removeEventListener("blur", closeOnViewportChange);
        };
    }, [isOpen]);

    if (!workerId) return <>{children}</>;

    return (
        <div
            ref={triggerRef}
            className={cn("inline-block", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleTriggerLeave}
        >
            {children}

            {isOpen &&
                createPortal(
                    <div
                        ref={cardRef}
                        className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                        style={style}
                        onMouseEnter={allowCardHover ? handleCardEnter : undefined}
                        onMouseLeave={handleCardLeave}
                    >
                        <div className="w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-5 flex flex-col gap-4 pointer-events-auto">
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
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-slate-800 text-base tracking-tight">{data.name}</h4>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100/50 rounded-full">
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    data.currentLocationCode ? "bg-blue-500" : "bg-slate-400"
                                                )}
                                            />
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {data.currentLocationCode ? "작업 중" : "위치 미상"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 w-full mb-1" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">TODAY WORK</p>
                                            <p className="text-xl font-bold text-slate-700 leading-none">
                                                {data.todayWorkCount}
                                                <span className="text-xs font-medium text-slate-400 ml-1">건</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">LOCATION</p>
                                            <p className="text-base font-bold text-slate-700 leading-tight">{data.currentLocationCode || "-"}</p>
                                        </div>
                                    </div>

                                    {data.recentIssueType && (
                                        <div
                                            role={data.recentIssueId ? "button" : undefined}
                                            tabIndex={data.recentIssueId ? 0 : undefined}
                                            onClick={() => data.recentIssueId && navigate(`/admin/issue?issueId=${data.recentIssueId}`)}
                                            onKeyDown={(e) => {
                                                if (!data.recentIssueId) return;
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    navigate(`/admin/issue?issueId=${data.recentIssueId}`);
                                                }
                                            }}
                                            className={cn(
                                                "mt-1 rounded-xl border overflow-hidden",
                                                data.recentIssueType === "OUT_OF_STOCK"
                                                    ? "bg-amber-50/50 border-amber-100/50"
                                                    : "bg-rose-50/50 border-rose-100/50",
                                                data.recentIssueId &&
                                                    "group cursor-pointer transition-all hover:shadow-sm hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "px-3 py-2 flex items-center gap-1.5 border-b",
                                                    data.recentIssueType === "OUT_OF_STOCK"
                                                        ? "border-amber-100/50 bg-amber-100/20"
                                                        : "border-rose-100/50 bg-rose-100/20"
                                                )}
                                            >
                                                <Siren
                                                    className={cn(
                                                        "w-3.5 h-3.5",
                                                        data.recentIssueType === "OUT_OF_STOCK" ? "text-amber-600" : "text-rose-600"
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-bold",
                                                        data.recentIssueType === "OUT_OF_STOCK"
                                                            ? "text-amber-700 group-hover:text-amber-800"
                                                            : "text-rose-700 group-hover:text-rose-800"
                                                    )}
                                                >
                                                    최근 신고된 이슈
                                                </span>
                                            </div>

                                            <div className="p-3">
                                                <p
                                                    className={cn(
                                                        "text-xs font-bold mb-0.5",
                                                        data.recentIssueType === "OUT_OF_STOCK" ? "text-amber-900" : "text-rose-900"
                                                    )}
                                                >
                                                    {data.recentIssueType === "OUT_OF_STOCK" ? "재고 부족" : "물품 파손"}
                                                </p>
                                                <p
                                                    className={cn(
                                                        "text-[10px] leading-relaxed",
                                                        data.recentIssueType === "OUT_OF_STOCK" ? "text-amber-700/80" : "text-rose-700/80"
                                                    )}
                                                >
                                                    {data.recentIssueType === "OUT_OF_STOCK"
                                                        ? "재고 부족 이슈가 최근에 신고되었습니다."
                                                        : "물품 파손 이슈가 최근에 신고되었습니다."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-xs text-slate-400 text-center py-2">정보를 불러오지 못했습니다.</div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
