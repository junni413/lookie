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

export const rebalanceService = {
    recommend: async (): Promise<RebalanceRecommendation | null> => {
        try {
            const response = await request<ApiResponse<RebalanceRecommendation>>("/api/rebalance/recommend", {
                method: "POST"
            });
            if (response.success && response.data) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error("Failed to get recommendation", error);
            throw error;
        }
    },

    apply: async (moves: RebalanceMove[], reason: string = "AI Recommendation Applied"): Promise<boolean> => {
        try {
            // Transform to backend expected format (camelCase for apply request)
            const payload: ApplyRequest = {
                moves: moves.map(m => ({
                    workerId: m.worker_id,
                    toZone: m.to_zone
                })),
                reason
            };

            const response = await request<ApiResponse<void>>("/api/rebalance/apply", {
                method: "POST",
                body: payload
            });

            return response.success;
        } catch (error) {
            console.error("Failed to apply rebalance", error);
            throw error;
        }
    }
};
