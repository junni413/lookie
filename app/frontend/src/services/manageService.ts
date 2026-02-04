
import type { DB_Worker, ZoneLayout } from "@/types/db";
import { zonesLayoutMock, db_users } from "@/mocks/mockData";
import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import { adminService } from "./adminService";

import { DEFAULT_ZONES, mergeZoneData } from "@/utils/zoneUtils";
import type { ZoneStat } from "@/types/db"; // Import from types/db

export const manageService = {
    // Get all workers with full details
    getAllWorkers: async (): Promise<DB_Worker[]> => {
        try {
            // Define the API response item structure locally or import it if shared
            interface ActiveWorkerResponse {
                workLogId: number;
                workerId: number;
                workerName: string;
                assignedZoneId: number;
                currentStatus: 'START' | 'PAUSE' | 'RESUME' | 'END';
                startedAt: string;
                endedAt: string | null;
                plannedEndAt: string;
                lastStatusChangedAt: string;
                lineId: number;
                locationCode: string;
                workCount: number;
                workRate: number;
            }

            const response = await request<ApiResponse<ActiveWorkerResponse[]>>("/api/admin/work-logs/active");

            if (!response.success || !response.data) {
                console.warn("API returned unsuccessful or empty data");
                return [];
            }

            return response.data.map(item => {
                // Map API status to Frontend status
                let status: 'WORKING' | 'PAUSED' | 'OFF_WORK' = 'OFF_WORK';
                if (item.currentStatus === 'START' || item.currentStatus === 'RESUME') {
                    status = 'WORKING';
                } else if (item.currentStatus === 'PAUSE') {
                    status = 'PAUSED';
                }

                // Construct DB_Worker object
                // minimal fields required by UI are populated from API
                // others are filled with defaults/dummies as they might not be needed for the list view
                return {
                    userId: item.workerId,
                    role: 'WORKER',
                    passwordHash: '', // Not needed for display
                    name: item.workerName,
                    phoneNumber: '', // Not provided by this API
                    isActive: true, // Assumed active if returned by "active" endpoint
                    createdAt: item.startedAt, // Using startedAt as a proxy or just dummy
                    updatedAt: item.lastStatusChangedAt,
                    assignedZoneId: item.assignedZoneId,

                    // Derived properties
                    status: status,
                    currentZoneId: item.assignedZoneId,
                    todayWorkCount: item.workCount,
                    workRate: item.workRate,
                    lineNumber: item.lineId,
                    // binNumber is not in API response, omitting or setting typical default if needed
                } as DB_Worker;
            });

        } catch (error: any) {
            console.error("API Error fetching workers:", error);
            if (error.response && error.response.status === 403) {
                // Rethrow with user-friendly message so Map.tsx can show it
                throw new Error("관리자 권한이 필요합니다. (403 Forbidden)");
            }
            throw new Error("작업자 목록을 불러오는데 실패했습니다.");
        }
    },

    // Get statistics for all zones (Now uses Real API via adminService)
    getZoneStats: async (): Promise<ZoneStat[]> => {
        try {
            // 1. Fetch real stats from API
            const apiZones = await adminService.getZones();
            
            // 2. Merge with Default Zones (Fallback) using shared utility
            return mergeZoneData(apiZones);
        } catch (error) {
            console.error("Failed to load real zone stats, using defaults:", error);
            return DEFAULT_ZONES;
        }
    },

    // Update worker zone (Mock)
    moveWorker: async (workerId: number, targetZoneId: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log(`[Mock API] Moved worker ${workerId} to zone ${targetZoneId}`);
        // Update mock data in memory
        const u = db_users.find(u => u.userId === workerId);
        if (u) u.assignedZoneId = targetZoneId;
    },

    // Batch update workers (Mock)
    updateWorkers: async (workers: DB_Worker[]): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[Mock API] Batch updating ${workers.length} workers...`);
    },

    // Get Zone Layout (Mock)
    getZoneLayout: async (zoneId: number): Promise<ZoneLayout | null> => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const layout = zonesLayoutMock[zoneId];
        return layout || null;
    }
};
