
import type { DB_Worker, ZoneLayout } from "@/types/db";
import { zonesLayoutMock } from "@/mocks/mockData";
import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import { adminService } from "./adminService";
import type { ZoneMoveRequest } from "./adminService";

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

        } catch (error: unknown) {
            console.error("API Error fetching workers:", error);
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 403) {
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

    getZoneStatsSimulated: async (moves: ZoneMoveRequest[]): Promise<ZoneStat[]> => {
        try {
            if (!moves || moves.length === 0) {
                const apiZones = await adminService.getZones();
                return mergeZoneData(apiZones);
            }
            const apiZones = await adminService.simulateZones(moves);
            return mergeZoneData(apiZones);
        } catch (error) {
            console.error("Failed to load simulated zone stats, using defaults:", error);
            return DEFAULT_ZONES;
        }
    },

    // Expanded Worker Fetching (All Workers + Zone Detail Merge)
    // Expanded Worker Fetching (Optimized: Assigned Only via Zone API)
    getAssignedWorkers: async (): Promise<DB_Worker[]> => {
        try {
            // 1. Fetch Detailed Info for Zones 1-4 ONLY (No "All Workers" call)
            const zonePromises = DEFAULT_ZONES.map(z => adminService.getWorkersByZone(z.zoneId)
                .catch(err => {
                    console.warn(`Failed to fetch workers for zone ${z.zoneId}`, err);
                    return [];
                })
            );

            const zonesResults = await Promise.all(zonePromises);
            
            // 2. Flatten and Map to DB_Worker
            const allAssignedWorkers: DB_Worker[] = [];
            
            zonesResults.forEach((zoneWorkers, index) => {
                const zoneId = DEFAULT_ZONES[index].zoneId; // Correct Zone ID from loop
                
                zoneWorkers.forEach(dto => {

                    // Map DTO status string to Enum
                    let mappedStatus: 'WORKING' | 'PAUSED' | 'OFF_WORK' = 'OFF_WORK';
                    if (dto.status === 'START' || dto.status === 'RESUME' || dto.status === 'WORKING') mappedStatus = 'WORKING';
                    else if (dto.status === 'PAUSE' || dto.status === 'PAUSED') mappedStatus = 'PAUSED';

                    const worker: DB_Worker = {
                        userId: dto.workerId,
                        name: dto.name,
                        role: 'WORKER',
                        isActive: true,
                        passwordHash: '',
                        phoneNumber: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        
                        // Assignment Info
                        assignedZoneId: zoneId,
                        currentZoneId: zoneId,
                        
                        // Stats
                        status: mappedStatus,
                        todayWorkCount: dto.workCount,
                        processingSpeed: dto.processingSpeed,
                        currentTaskProgress: dto.currentTaskProgress,
                        workRate: Math.floor(dto.currentTaskProgress || 0),
                        webrtcStatus: dto.webrtcStatus
                    };
                    allAssignedWorkers.push(worker);
                });
            });

            return allAssignedWorkers;

        } catch (error) {
            console.error("Failed to fetch assigned detailed workers", error);
            return [];
        }
    },



    // Batch update workers (Real API)
    updateWorkers: async (changedWorkers: DB_Worker[]): Promise<void> => {
        if (changedWorkers.length === 0) return;

        // Call assignWorkerToZone for each changed worker in parallel
        const promises = changedWorkers.map(worker => {
             if (worker.currentZoneId === null) return Promise.resolve(); // Skip if no zone (or handle unassign?)
             // API requires zoneId. If unassign logic exists, we need standard unassign API. 
             // Currently assuming re-assign to valid zone.
             return adminService.assignWorkerToZone(worker.userId, worker.currentZoneId!, "Manual Reallocation");
        });

        await Promise.all(promises);
    },

    // Get Zone Layout (Mock)
    getZoneLayout: async (zoneId: number): Promise<ZoneLayout | null> => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const layout = zonesLayoutMock[zoneId];
        return layout || null;
    }
};
