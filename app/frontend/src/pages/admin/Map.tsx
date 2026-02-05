import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { manageService } from "@/services/manageService";
import type { DB_Worker, ZoneLayout, ZoneStat } from "@/types/db";
import ZoneSummaryCard from "./components/map/ZoneSummaryCard";
import ZoneMapModal from "./components/map/ZoneMapModal";
import WorkerList from "./components/map/WorkerList";
import { cn } from "@/utils/cn";
import AdminPageHeader from "@/components/layout/AdminPageHeader";

export default function Map() {
    const [searchParams] = useSearchParams();
    const [stats, setStats] = useState<ZoneStat[]>([]);
    const [workers, setWorkers] = useState<DB_Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Interaction State
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    // Panel State
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [isWorkerPanelOpen, setIsWorkerPanelOpen] = useState(false);
    const [selectedLayout, setSelectedLayout] = useState<ZoneLayout | null>(null);
    useEffect(() => {
        loadData();
    }, []);

    // Initial URL Param Handling for Navigation from Dashboard
    useEffect(() => {
        const queryZoneId = searchParams.get("zoneId");
        if (queryZoneId) {
            const zId = parseInt(queryZoneId);
            if (!isNaN(zId)) {
                setSelectedZoneId(zId);
                setIsWorkerPanelOpen(true);
            }
        }
    }, [searchParams]);

    // Load Layout when Zone is selected for MAP modal

    // Load Layout when Zone is selected for MAP modal
    useEffect(() => {
        if (selectedZoneId !== null && isMapModalOpen) {
            loadZoneLayout(selectedZoneId);
        }
    }, [selectedZoneId, isMapModalOpen]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [fetchedStats, fetchedWorkers] = await Promise.all([
                manageService.getZoneStats(),
                manageService.getAssignedWorkers()
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

    // 1. Click on Card Body -> Show Map Modal
    const handleCardClick = (zoneId: number) => {
        setSelectedZoneId(zoneId);
        setIsMapModalOpen(true);
    };

    // 2. Click on Zone List Button -> Toggle Worker Panel
    const handleListButtonClick = (zoneId: number) => {
        if (selectedZoneId === zoneId && isWorkerPanelOpen) {
            // Close if already open for this zone
            setIsWorkerPanelOpen(false);
            setSelectedZoneId(null);
        } else {
            // Open for new zone
            setSelectedZoneId(zoneId);
            setIsWorkerPanelOpen(true);
        }
    };

    const handleCloseMapModal = () => {
        setIsMapModalOpen(false);
        // Don't reset selectedZoneId if worker panel is open, 
        // but here map modal takes full focus, so maybe we should?
        // Let's keep separate logic.
        if (!isWorkerPanelOpen) {
            setSelectedZoneId(null);
        }
    };

    const handleCloseWorkerPanel = () => {
        setIsWorkerPanelOpen(false);
        setSelectedZoneId(null);
    };

    // 3. WorkerList에서 구역 필터 변경 -> 왼쪽 맵도 동기화
    const handleWorkerFilterChange = (zoneId: number | 'all') => {
        if (zoneId === 'all') {
            setSelectedZoneId(null);
        } else {
            setSelectedZoneId(zoneId);
        }
    };

    if (loading && stats.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-500">데이터를 불러오는 중입니다...</div>;
    }

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-500">오류 발생: {error}</div>;
    }

    const selectedZoneName = stats.find(s => s.zoneId === selectedZoneId)?.name || "";

    return (
        <div className="flex flex-col h-full relative">
            <AdminPageHeader
                title="현장 관제 맵"
                description="공장 전체의 구역 배치와 작업자 현황을 시각적으로 모니터링합니다."
            />
            <div className="flex-1 flex overflow-hidden min-h-0 gap-4 h-full pb-6 px-8">
                {/* Left Panel: Zone Cards Grid - Resizes when panel opens */}
                <div className={cn(
                    "flex flex-col overflow-y-auto transition-all duration-300 rounded-xl border border-slate-200 bg-white/50 shadow-sm h-full",
                    isWorkerPanelOpen ? "w-[60%]" : "w-full"
                )}>
                    {/* Zone Cards Grid */}
                    <div className="p-6 h-full">
                        <div className={cn(
                            "grid gap-4 w-full mx-auto h-full content-stretch",
                            isWorkerPanelOpen ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
                        )}>
                            {stats.map(stat => (
                                <div key={stat.zoneId} className="h-full">
                                    <ZoneSummaryCard
                                        zoneName={stat.name}
                                        status={stat.status}
                                        workerCount={stat.workerCount}
                                        workRate={stat.workRate}
                                        isSelected={selectedZoneId === stat.zoneId}
                                        onCardClick={() => handleCardClick(stat.zoneId)}
                                        onNameClick={() => handleListButtonClick(stat.zoneId)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Worker List - Slides in */}
                <div className={cn(
                    "flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl h-full transition-all duration-300 overflow-hidden",
                    isWorkerPanelOpen ? "w-[40%] translate-x-0 opacity-100 ml-2" : "w-0 translate-x-full opacity-0 ml-0 border-0"
                )}>
                    {isWorkerPanelOpen && (
                        <div className="flex-1 overflow-hidden p-0">
                            <WorkerList
                                currentZoneId={selectedZoneId}
                                allWorkers={workers}
                                onFilterChange={handleWorkerFilterChange}
                                onClose={handleCloseWorkerPanel}
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Zone Map Modal */}
            <ZoneMapModal
                isOpen={isMapModalOpen}
                onClose={handleCloseMapModal}
                zoneName={selectedZoneName}
                layout={selectedLayout}
                workers={workers}
            />

            {/* 스크롤바 숨김 스타일 */}
            <style>{`
                .overflow-y-auto::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                }
            `}</style>
        </div>
    );
}
