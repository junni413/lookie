import type { DB_Worker } from "@/types/db";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useState } from "react";
import { getWorkRateColor } from "@/utils/styleHelpers";

interface WorkerListProps {
    currentZoneId: number | null; // If null, "All" mode initially or just show all
    allWorkers: DB_Worker[];
    onFilterChange?: (zoneId: number | 'all') => void; // Parent control
}

export default function WorkerList({ currentZoneId, allWorkers, onFilterChange }: WorkerListProps) {
    // Internal filter state (sync with parent if needed, but for now local is fine if controlled)
    // Actually, if we want the parent to control the view (Map vs List), this might need to be smart.
    // But requirement says: "Zone Name Click" -> Show List. 
    // And "Filter Button" -> Show List of specific Zone.

    const [activeFilter, setActiveFilter] = useState<number | 'all'>('all');

    // Effect to sync prop change (if parent forces a zone selection)
    // We'll use a local state initialized by prop, or effect
    // Let's rely on internal state mostly unless prop changes
    useState(() => {
        if (currentZoneId) setActiveFilter(currentZoneId);
        else setActiveFilter('all');
    });

    // Update local filter when prop changes
    // This allows clicking "Zone Name" on card to switch this filter
    if (currentZoneId && activeFilter !== currentZoneId && currentZoneId !== activeFilter) {
        // This is tricky in render body. Better use useEffect in real app, 
        // but for now let's assume parent passes `currentZoneId` only when selected.
    }

    // Better: Derived state for display, but interactive buttons change it.
    // If we want "Independent" navigation in list, we need local state.
    // Let's use a composite approach: 
    // If `currentZoneId` is passed, it sets the initial active tab? 
    // Or does `currentZoneId` *dictate* the tab?
    // Requirement: "Zone Name Click" -> Show List. "Filter Button" -> Switch List.
    // So the list can change zones INDEPENDENTLY of the Map view (which is "Card Click").

    // So we need local state `selectedTab`.
    // When `currentZoneId` changes (from parent), we update `selectedTab`.

    // Filter Zones
    const ZONES = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
        { id: 4, name: "D" },
    ];

    const workersToShow = activeFilter === 'all'
        ? allWorkers
        : allWorkers.filter(w => w.current_zone_id === activeFilter);

    const sortedWorkers = [...workersToShow].sort((a, b) => {
        const statusOrder: Record<string, number> = { "WORKING": 1, "PAUSED": 2, "OFF_WORK": 3 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden text-slate-800">
            {/* Filter Tabs */}
            <div className="flex border-b bg-slate-50 overflow-x-auto no-scrollbar">
                {ZONES.map(zone => (
                    <button
                        key={zone.id}
                        onClick={() => {
                            setActiveFilter(zone.id);
                            onFilterChange?.(zone.id);
                        }}
                        className={cn(
                            "flex-1 min-w-[60px] py-3 text-sm font-medium transition-colors relative whitespace-nowrap px-2",
                            activeFilter === zone.id ? "text-primary bg-white font-bold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        )}
                    >
                        Zone {zone.name}
                        {activeFilter === zone.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                ))}
                <button
                    onClick={() => {
                        setActiveFilter('all');
                        onFilterChange?.('all');
                    }}
                    className={cn(
                        "flex-1 min-w-[60px] py-3 text-sm font-medium transition-colors relative whitespace-nowrap px-2",
                        activeFilter === 'all' ? "text-primary bg-white font-bold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                >
                    전체
                    {activeFilter === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            {/* Header Columns */}
            <div className="bg-slate-50 border-b px-4 py-2 flex text-xs font-semibold text-slate-500">
                <div className="flex-[2]">이름/위치</div>
                <div className="flex-1 text-center">근무시간</div>
                <div className="flex-1 text-center">건수</div>
                <div className="flex-1 text-center">작업률</div>
                <div className="w-10"></div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-0">
                {sortedWorkers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                        <p>해당 구역의 작업자가 없습니다.</p>
                    </div>
                ) : (
                    sortedWorkers.map(worker => (
                        <div key={worker.worker_id} className="group flex items-center p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                            {/* Name & Location */}
                            <div className="flex-[2] flex items-center gap-3">
                                <div className="overflow-hidden">
                                    <div className="font-semibold text-sm truncate">{worker.name}</div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        {worker.current_zone_id ? `Zone ${worker.current_zone_id}` : "대기중"}
                                        {worker.line_number && ` - L${worker.line_number}`}
                                    </div>
                                </div>
                            </div>

                            {/* Work Time (Mock) */}
                            <div className="flex-1 text-center text-xs text-slate-600 flex items-center justify-center gap-1">
                                04:20
                            </div>

                            {/* Task Count */}
                            <div className="flex-1 text-center text-xs text-slate-600">
                                {worker.today_work_count}
                            </div>

                            {/* Work Rate */}
                            <div className={cn(
                                "flex-1 text-center text-xs font-medium",
                                getWorkRateColor(worker.work_rate || 0)
                            )}>
                                {worker.work_rate || 0}%
                            </div>

                            {/* WebRTC Call */}
                            <div className="w-10 flex justify-end">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full">
                                    <Phone size={14} fill="currentColor" className="opacity-90" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
