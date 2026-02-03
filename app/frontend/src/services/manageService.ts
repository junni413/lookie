
import type { DB_Worker, ZoneLayout } from "@/types/db";
import { zonesLayoutMock, db_users, db_zones, zoneNames, getDerivedWorker } from "@/mocks/mockData";

export interface ZoneStat {
    zone_id: number;
    name: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    worker_count: number;
    work_rate: number; // percentage (0-100)
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
                .map(u => getDerivedWorker(u.user_id))
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
            const zoneWorkers = workers.filter((w) => w.current_zone_id === zone.zone_id);

            // Calculate average work rate
            const totalRate = zoneWorkers.reduce((sum, w) => sum + (w.work_rate || 0), 0);
            const avgRate = zoneWorkers.length > 0 ? Math.floor(totalRate / zoneWorkers.length) : 0;

            const name = zoneNames[zone.zone_id] || "Unknown";

            return {
                zone_id: zone.zone_id,
                name: name,
                status: "STABLE", // Simplified logic
                worker_count: zoneWorkers.length,
                work_rate: avgRate,
            };
        });
    },

    // Update worker zone (Mock)
    moveWorker: async (workerId: number, targetZoneId: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log(`[Mock API] Moved worker ${workerId} to zone ${targetZoneId}`);
        // Update mock data in memory
        const u = db_users.find(u => u.user_id === workerId);
        if (u) u.assigned_zone_id = targetZoneId;
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
