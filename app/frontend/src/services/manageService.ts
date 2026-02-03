import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import type { DB_Worker, ZoneLayout } from "@/types/db";
import { zonesLayoutMock, zonesMock } from "@/mocks/mockData";

export interface ZoneStat {
    zone_id: number;
    name: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    worker_count: number;
    work_rate: number; // percentage (0-100)
}

// DTO from Backend
interface WorkLogResponseDto {
    workLogId: number;
    workerId: number;
    workerName: string;
    zoneId: number;
    currentStatus: 'START' | 'PAUSE' | 'RESUME' | 'END';
    startedAt: string;
    endedAt: string | null;
    plannedEndAt: string | null;
    lastStatusChangedAt: string;
    lineId: number | null;
    locationCode: string | null;
    workCount: number | null;
    workRate: number | null;
}

export const manageService = {
    // Get all workers with full details
    getAllWorkers: async (): Promise<DB_Worker[]> => {
        try {
            const response = await request<ApiResponse<WorkLogResponseDto[]>>("/api/admin/work-logs/active");
            if (!response.success || !response.data) {
                console.error("Failed to fetch workers:", response.message);
                return [];
            }

            return response.data.map((dto) => {
                let status: "WORKING" | "PAUSED" | "OFF_WORK" = "OFF_WORK";
                if (dto.currentStatus === 'START' || dto.currentStatus === 'RESUME') status = "WORKING";
                else if (dto.currentStatus === 'PAUSE') status = "PAUSED";
                else if (dto.currentStatus === 'END') status = "OFF_WORK";

                return {
                    worker_id: dto.workerId,
                    name: dto.workerName,
                    status,
                    current_zone_id: dto.zoneId,
                    today_work_count: dto.workCount || 0,
                    work_rate: dto.workRate ? Math.floor(dto.workRate) : 0,
                    line_number: dto.lineId || undefined,
                };
            });
        } catch (error) {
            console.error("API Error fetching workers:", error);
            return [];
        }
    },

    // Get statistics for all zones
    getZoneStats: async (): Promise<ZoneStat[]> => {
        // Fetch real workers first
        const workers = await manageService.getAllWorkers();

        // Use static zonesMock for zone definitions
        return zonesMock.map((zone) => {
            const zoneWorkers = workers.filter((w) => w.current_zone_id === zone.id);

            // Calculate average work rate
            const totalRate = zoneWorkers.reduce((sum, w) => sum + (w.work_rate || 0), 0);
            const avgRate = zoneWorkers.length > 0 ? Math.floor(totalRate / zoneWorkers.length) : 0;

            return {
                zone_id: zone.id,
                name: zone.name,
                status: zone.status as "STABLE" | "NORMAL" | "CRITICAL",
                worker_count: zoneWorkers.length,
                work_rate: avgRate,
            };
        });
    },

    // Update worker zone (Mock - no API endpoint identified yet)
    moveWorker: async (workerId: number, targetZoneId: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log(`[Mock API] Moved worker ${workerId} to zone ${targetZoneId}`);
    },

    // Batch update workers (Mock - no API endpoint identified yet)
    updateWorkers: async (workers: DB_Worker[]): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[Mock API] Batch updating ${workers.length} workers...`);
    },

    // Get Zone Layout (Mock - no API endpoint identified yet)
    getZoneLayout: async (zoneId: number): Promise<ZoneLayout | null> => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const layout = zonesLayoutMock[zoneId];
        return layout || null;
    }
};
