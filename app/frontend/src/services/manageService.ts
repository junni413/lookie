import { workersMock, zonesMock, getDerivedWorker } from "@/mocks/mockData";
import type { DB_Worker } from "@/types/db";

export interface ZoneStat {
    zone_id: number;
    name: string;
    status: "NORMAL" | "BUSY" | "ISSUE";
    worker_count: number;
    work_rate: number; // percentage (0-100)
}

export const manageService = {
    // Get all workers with full details
    getAllWorkers: async (): Promise<DB_Worker[]> => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        return Object.keys(workersMock).map((id) => getDerivedWorker(Number(id)));
    },

    // Get statistics for all zones
    getZoneStats: async (): Promise<ZoneStat[]> => {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const workers = Object.keys(workersMock).map((id) => getDerivedWorker(Number(id)));

        return zonesMock.map((zone) => {
            const zoneWorkers = workers.filter((w) => w.current_zone_id === zone.id);

            // Mock random work rate for demo purposes, or derive from tasks if available
            // For now, let's use a static random logic based on zone ID to keep it consistent
            const mockRate = 60 + (zone.id * 10) % 35;

            return {
                zone_id: zone.id,
                name: zone.name,
                status: zone.status as "NORMAL" | "BUSY" | "ISSUE",
                worker_count: zoneWorkers.length,
                work_rate: mockRate,
            };
        });
    },

    // Update worker zone (Mock)
    moveWorker: async (workerId: number, targetZoneId: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log(`[Mock API] Moved worker ${workerId} to zone ${targetZoneId}`);
    },

    // Batch update workers (Mock)
    updateWorkers: async (workers: DB_Worker[]): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[Mock API] Batch updating ${workers.length} workers...`);
        // In real backend, we would send the full list or diff
    }
};
