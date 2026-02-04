
import type { DB_Worker, ZoneLayout } from "@/types/db";
import { zonesLayoutMock, db_users, db_zones, zoneNames, getDerivedWorker } from "@/mocks/mockData";

export interface ZoneStat {
    zoneId: number;
    name: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    workerCount: number;
    workRate: number; // percentage (0-100)
}



export const manageService = {
    // Get all workers with full details
    getAllWorkers: async (): Promise<DB_Worker[]> => {
        try {
            await new Promise(r => setTimeout(r, 200)); // Simulate delay
            // Use mock data because the real API might be 403 or not ready as per context
            // But if we want to try API first:
            // const response = await request<ApiResponse<WorkLogResponseDto[]>>("/api/admin/work-logs/active");

            // For this Refactor Task, lets rely on our new robust Mock Data first to ensure UI works,
            // or try API and fallback.
            // Current Mock Data `getDerivedWorker` is perfect.

            const workers = db_users
                .filter(u => u.role === "WORKER")
                .map(u => getDerivedWorker(u.userId))
                .filter((w): w is DB_Worker => w !== null);

            return workers;

        } catch (error) {
            console.error("API Error fetching workers:", error);
            return [];
        }
    },

    // Get statistics for all zones
    getZoneStats: async (): Promise<ZoneStat[]> => {
        // Fetch real workers first
        const workers = await manageService.getAllWorkers();

        // Use static db_zones
        return db_zones.map((zone) => {
            const zoneWorkers = workers.filter((w) => w.currentZoneId === zone.zoneId);

            // Calculate average work rate
            const totalRate = zoneWorkers.reduce((sum, w) => sum + (w.workRate || 0), 0);
            const avgRate = zoneWorkers.length > 0 ? Math.floor(totalRate / zoneWorkers.length) : 0;

            const name = zoneNames[zone.zoneId] || "Unknown";

            return {
                zoneId: zone.zoneId,
                name: name,
                status: "STABLE", // Simplified logic
                workerCount: zoneWorkers.length,
                workRate: avgRate,
            };
        });
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
