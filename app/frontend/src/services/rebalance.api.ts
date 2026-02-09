import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";

export type RebalanceMove = {
    worker_id: number;
    from_zone: number;
    to_zone: number;
    reason?: string;
    score?: number;
};

export type RebalanceRecommendation = {
    ts: string;
    batch_id: number;
    moves: RebalanceMove[];
    total_risk_before?: number;
    total_risk_after?: number;
    total_expected_risk_reduction?: number;
};

export type ApplyRequest = {
    moves: { workerId: number; toZone: number }[];
    reason?: string;
};

export type ZoneOverviewDto = {
    zoneId: number;
    zoneName: string;
    workerCount: number;
    progressRate: number;
    status: "STABLE" | "NORMAL" | "CRITICAL";
};

export const rebalanceService = {
    recommend: async (): Promise<RebalanceRecommendation | null> => {
        try {
            const response = await request<ApiResponse<RebalanceRecommendation>>("/api/rebalance/recommend", {
                method: "POST"
            });
            if (response.success && response.data) {
                console.log("[RebalanceAPI] Recommendation Success:", response.data);
                return response.data;
            }
            console.warn("[RebalanceAPI] Recommendation successful but no data");
            return null;
        } catch (error) {
            console.error("Failed to get recommendation", error);
            throw error;
        }
    },

    apply: async (moves: RebalanceMove[], reason: string = "AI Recommendation Applied"): Promise<ZoneOverviewDto[] | null> => {
        try {
            // Transform to backend expected format (camelCase for apply request)
            const payload: ApplyRequest = {
                moves: moves.map(m => ({
                    workerId: m.worker_id,
                    toZone: m.to_zone
                })),
                reason
            };

            const response = await request<ApiResponse<ZoneOverviewDto[]>>("/api/rebalance/apply", {
                method: "POST",
                body: payload
            });

            console.log("[RebalanceAPI] Apply Response:", response);
            return response.success ? (response.data || []) : null;
        } catch (error) {
            console.error("Failed to apply rebalance", error);
            throw error;
        }
    }
};
