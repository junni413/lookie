import { useEffect, useState } from "react";
import { manageService, type ZoneStat } from "@/services/manageService";
import type { DB_Worker, ZoneLayout } from "@/types/db";
import ZoneSummaryCard from "./components/map/ZoneSummaryCard";
import ZoneDetailPanel from "./components/map/ZoneDetailPanel";
import WorkerList from "./components/map/WorkerList";
import { X, Layers, User } from "lucide-react";
import { Button } from "@/components/ui/button";

import { cn } from "@/utils/cn";

type RightPanelView = "MAP" | "LIST" | null;

export default function Map() {
    const [stats, setStats] = useState<ZoneStat[]>([]);
    const [workers, setWorkers] = useState<DB_Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Interaction State
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [rightPanelView, setRightPanelView] = useState<RightPanelView>(null);
    const [selectedLayout, setSelectedLayout] = useState<ZoneLayout | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Load Layout when Zone is selected for MAP view
    useEffect(() => {
        if (selectedZoneId !== null && rightPanelView === 'MAP') {
            loadZoneLayout(selectedZoneId);
        }
    }, [selectedZoneId, rightPanelView]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [fetchedStats, fetchedWorkers] = await Promise.all([
                manageService.getZoneStats(),
                manageService.getAllWorkers()
            ]);
            setStats(fetchedStats);
            setWorkers(fetchedWorkers);
        } catch (error: any) {
            console.error("Failed to load manage data", error);
            setError(error.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const loadZoneLayout = async (zoneId: number) => {
        try {
            const layout = await manageService.getZoneLayout(zoneId);
            setSelectedLayout(layout);
        } catch (err) {
            console.error("Failed to load layout", err);
        }
    };

    // 1. Click on Card Body -> Show Map
    const handleCardClick = (zoneId: number) => {
        if (selectedZoneId === zoneId && rightPanelView === 'MAP') {
            handleClosePanel();
        } else {
            setSelectedZoneId(zoneId);
            setRightPanelView("MAP");
        }
    };

    // 2. Click on Zone Name -> Show List
    const handleNameClick = (zoneId: number) => {
        if (selectedZoneId === zoneId && rightPanelView === 'LIST') {
            handleClosePanel();
        } else {
            setSelectedZoneId(zoneId);
            setRightPanelView("LIST");
        }
    };

    const handleClosePanel = () => {
        // Only close right panel, keep selection potentially? 
        // Requirement implies simpler toggle.
        setSelectedZoneId(null);
        setRightPanelView(null);
    };

    if (loading && stats.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-500">데이터를 불러오는 중입니다...</div>;
    }

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-500">오류 발생: {error}</div>;
    }

    const selectedZoneName = stats.find(s => s.zone_id === selectedZoneId)?.name || "";

    // Derived state for layout calculation
    const isPanelOpen = rightPanelView && selectedZoneId !== null;

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] space-y-4">


            <div className="flex-1 flex overflow-hidden min-h-0 gap-4">
                {/* Main Content Area (Center) */}
                <div className={cn(
                    "flex-1 flex flex-col overflow-y-auto transition-all duration-300 rounded-xl border border-slate-200 bg-white/50 shadow-sm",
                    isPanelOpen ? "mr-0" : ""
                )}>

                    {/* Zone Cards Grid */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mx-auto">
                            {stats.map(stat => (
                                <ZoneSummaryCard
                                    key={stat.zone_id}
                                    zoneName={stat.name}
                                    status={stat.status}
                                    workerCount={stat.worker_count}
                                    workRate={stat.work_rate}
                                    isSelected={selectedZoneId === stat.zone_id}
                                    onCardClick={() => handleCardClick(stat.zone_id)}
                                    onNameClick={() => handleNameClick(stat.zone_id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel Container (Flex Item) */}
                {isPanelOpen && (
                    <div className="h-full flex flex-col bg-white border rounded-xl shadow-lg w-[480px] shrink-0 transition-all overflow-hidden z-10">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {rightPanelView === 'MAP' ? (
                                    <><Layers className="text-primary w-5 h-5" /> {selectedZoneName} 공간 구조</>
                                ) : (
                                    <><User className="text-primary w-5 h-5" /> {selectedZoneName} 작업자 현황</>
                                )}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={handleClosePanel} className="h-8 w-8 hover:bg-slate-100 rounded-full">
                                <X size={18} />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden p-0 relative bg-slate-50 flex flex-col h-full">
                            {/* Enforce flex-col and h-full to fill the panel regardless of content */}
                            {rightPanelView === 'MAP' ? (
                                <div className="flex-1 h-full overflow-hidden">
                                    <ZoneDetailPanel
                                        layout={selectedLayout}
                                        allWorkers={workers}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 h-full overflow-hidden">
                                    <WorkerList
                                        currentZoneId={selectedZoneId}
                                        allWorkers={workers}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
