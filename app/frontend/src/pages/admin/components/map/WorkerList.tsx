import type { DB_Worker } from "@/types/db";
import { cn } from "@/utils/cn";
import { Phone, Users, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getWorkRateColor } from "@/utils/styleHelpers";
import { useCallStore } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";

interface WorkerListProps {
    currentZoneId: number | null;
    allWorkers: DB_Worker[];
    onFilterChange?: (zoneId: number | 'all') => void;
    onClose?: () => void;
}

export default function WorkerList({ currentZoneId, allWorkers, onFilterChange, onClose }: WorkerListProps) {
    const [activeFilter, setActiveFilter] = useState<number | 'all'>('all');
    const startCall = useCallStore((state) => state.startCall);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (currentZoneId) {
            setActiveFilter(currentZoneId);
        } else {
            setActiveFilter('all');
        }
    }, [currentZoneId]);

    const handleCallClick = (worker: DB_Worker) => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }
        startCall(user.userId, worker.worker_id, null, worker.name);
    };

    const ZONES = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
        { id: 4, name: "D" },
    ];

    const workersToShow = activeFilter === 'all'
        ? allWorkers
        : allWorkers.filter(w => w.current_zone_id === activeFilter);

    const searchedWorkers = workersToShow;

    const sortedWorkers = [...searchedWorkers].sort((a, b) => {
        const statusOrder: Record<string, number> = { "WORKING": 1, "PAUSED": 2, "OFF_WORK": 3 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });



    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-5 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-primary/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800">작업자 현황</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {sortedWorkers.length}명 {activeFilter !== 'all' && `· Zone ${ZONES.find(z => z.id === activeFilter)?.name}`}
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="h-8 w-8 hover:bg-white/80 rounded-full text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* 구역 필터 탭 */}
            <div className="flex border-b bg-white overflow-x-auto no-scrollbar px-4">
                {ZONES.map(zone => (
                    <button
                        key={zone.id}
                        onClick={() => {
                            setActiveFilter(zone.id);
                            onFilterChange?.(zone.id);
                        }}
                        className={cn(
                            "relative flex-1 min-w-[65px] py-3 px-3 text-xs font-semibold transition-all duration-200",
                            activeFilter === zone.id
                                ? "text-primary"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Zone {zone.name}
                        {activeFilter === zone.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
                        )}
                    </button>
                ))}
                <button
                    onClick={() => {
                        setActiveFilter('all');
                        onFilterChange?.('all');
                    }}
                    className={cn(
                        "relative flex-1 min-w-[65px] py-3 px-3 text-xs font-semibold transition-all duration-200",
                        activeFilter === 'all'
                            ? "text-primary"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    전체
                    {activeFilter === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
                    )}
                </button>
            </div>

            {/* 작업자 리스트 */}
            <div className="flex-1 overflow-y-auto">
                {sortedWorkers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-4">
                        <Users className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                            해당 구역의 작업자가 없습니다
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sortedWorkers.map(worker => {
                            return (
                                <div key={worker.worker_id} className="group flex items-center gap-5 pl-7 pr-6 py-4 hover:bg-slate-50 transition-colors">

                                    {/* 정보 영역 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-800 truncate">
                                            {worker.name}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {worker.current_zone_id ? `Zone ${worker.current_zone_id}` : "대기중"}
                                            {worker.line_number && ` - L${worker.line_number}`}
                                        </div>
                                    </div>

                                    {/* 통계 정보 */}
                                    <div className="flex items-center gap-7 text-xs">
                                        <div className="text-center">
                                            <div className="text-slate-400 text-[10px] font-medium">건수</div>
                                            <div className="font-semibold text-slate-700">{worker.today_work_count}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-slate-400 text-[10px] font-medium">작업률</div>
                                            <div className={cn("font-semibold", getWorkRateColor(worker.work_rate || 0))}>
                                                {worker.work_rate || 0}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* 통화 버튼 */}
                                    <button
                                        onClick={() => handleCallClick(worker)}
                                        className="h-9 w-9 rounded-full transition-all flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                    >
                                        <Phone size={16} fill="currentColor" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
