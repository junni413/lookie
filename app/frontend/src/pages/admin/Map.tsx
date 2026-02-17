import { useEffect, useState } from "react";
import { useInterval } from "@/hooks/useInterval";
import { useSearchParams } from "react-router-dom";
import { manageService } from "@/services/manageService";
import { adminService } from "@/services/adminService";
import { useZoneStats } from "@/hooks/useZoneStats";

import type { DB_Worker, ZoneLayout } from "@/types/db";
import ZoneSummaryCard from "./components/map/ZoneSummaryCard";
import ZoneMapModal from "./components/map/ZoneMapModal";
import WorkerList from "./components/map/WorkerList";

import { cn } from "@/utils/cn";
import { applyWorkerCounts } from "@/utils/zoneUtils";
import AdminPageHeader from "@/components/layout/AdminPageHeader";


export default function Map() {
    const [searchParams] = useSearchParams();
    const { zones: stats } = useZoneStats({ pollingMs: 5000, autoRefresh: true });
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

    useEffect(() => {
        const onZonesRefresh = () => {
            loadData(true);
            if (isMapModalOpen && selectedZoneId !== null) {
                updateMapWorkers(selectedZoneId);
            }
        };
        const onStorage = (e: StorageEvent) => {
            if (e.key === "zones-refresh-ts") {
                onZonesRefresh();
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                onZonesRefresh();
            }
        };
        window.addEventListener("zones-refresh", onZonesRefresh);
        window.addEventListener("storage", onStorage);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.removeEventListener("zones-refresh", onZonesRefresh);
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [isMapModalOpen, selectedZoneId]);

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

    // Poll every 5 seconds
    useInterval(() => {
        loadData(true);
        if (isMapModalOpen && selectedZoneId !== null) {
            updateMapWorkers(selectedZoneId);
        }
    }, 5000);

    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError(null);
        try {
            const fetchedWorkers = await manageService.getAssignedWorkers();
            setWorkers(fetchedWorkers);
        } catch (error: any) {
            console.error("Failed to load manage data", error);
            setError(error.message || "Unknown error");
        } finally {
            if (!isBackground) setLoading(false);
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

    // Map Modal Data
    const [mapZoneWorkers, setMapZoneWorkers] = useState<DB_Worker[]>([]);

    const updateMapWorkers = async (zoneId: number) => {
        try {
            // Fetch real map data
            const mapData = await adminService.getZoneMap(zoneId);
            
            // Convert DTO to DB_Worker format for UI
            // API Response: { zoneId, zoneName, lines, workers: [...] }
            const workersList = mapData.workers || [];

            const parsedWorkers = workersList.map((dto: any) => {
                const { lineNumber, binNumber } = adminService.parseLocationCode(dto.currentLocationCode);
                
                return {
                    userId: dto.workerId,
                    name: dto.name,
                    lineNumber,
                    binNumber,
                    isBottleneck: dto.isBottleneck,
                    hasOpenIssue: dto.hasOpenIssue ?? false,
                    openIssueType: dto.openIssueType ?? undefined,
                    workRate: dto.workRate || 0,
                    
                    // Defaults for required DB_Worker fields
                    role: 'WORKER',
                    isActive: true,
                    status: 'WORKING', // Assumed working if bottleneck data exists
                    currentZoneId: zoneId,
                    todayWorkCount: 0,
                    passwordHash: '',
                    phoneNumber: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as DB_Worker;
            });
            
            setMapZoneWorkers(parsedWorkers);
        } catch (error) {
            console.error("Failed to load map workers", error);
            // setMapZoneWorkers([]); // Don't clear on failure during polling to avoid flicker
        }
    }

    // 1. Click on Card Body -> Show Map Modal & Fetch Data
    const handleCardClick = async (zoneId: number) => {
        setSelectedZoneId(zoneId);
        setIsMapModalOpen(true);
        await updateMapWorkers(zoneId);
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
        setMapZoneWorkers([]); // Clear data
        // Don't reset selectedZoneId if worker panel is open
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

    // 4. AI Rebalance Handlers


    if (loading && stats.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-500">데이터를 불러오는 중입니다...</div>;
    }

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-500">오류 발생: {error}</div>;
    }

    const displayStats = applyWorkerCounts(stats, workers).map(s => ({
        ...s,
        status: s.status,
    }));

    const selectedZoneName = displayStats.find(s => s.zoneId === selectedZoneId)?.name || "";

    return (
        <div className="flex flex-col h-full relative">
            <AdminPageHeader
                title="현장 관제 맵"
                description="공장 전체의 구역 배치와 작업자 현황을 시각적으로 모니터링합니다."
            >

            </AdminPageHeader>

            <div className="flex-1 flex overflow-hidden min-h-0 h-full pb-6 px-8">
                {/* Left Panel: Zone Cards Grid - Resizes when panel opens */}
                <div className={cn(
                    "flex flex-col overflow-y-auto transition-all duration-300 rounded-xl border border-slate-200 bg-white/50 shadow-sm h-full",
                    isWorkerPanelOpen ? "w-[60%]" : "w-full"
                )}>
                    {/* Zone Cards Grid */}
                    <div className="p-6 h-full">
                        <div className={cn(
                            "grid gap-3 w-full mx-auto h-full content-stretch",
                            isWorkerPanelOpen ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
                        )}>
                            {displayStats.map(stat => (
                                <div key={stat.zoneId} className="h-full">
                                    <ZoneSummaryCard
                                        zoneName={stat.name}
                                        status={stat.status}
                                        workerCount={stat.workerCount}
                                        workRate={stat.workRate}
                                        openIssueCount={stat.openIssueCount}
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
                    "flex flex-col h-full transition-all duration-300",
                    isWorkerPanelOpen ? "w-[40%] translate-x-0 opacity-100 pl-4" : "w-0 translate-x-full opacity-0 ml-0 border-0 overflow-hidden"
                )}>
                    {isWorkerPanelOpen && (
                        <div className="flex-1 overflow-hidden p-0 bg-white border border-slate-200 shadow-xl rounded-xl">
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
                workers={mapZoneWorkers}
            />

            {/* AI Rebalance Modal (New) */}


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
