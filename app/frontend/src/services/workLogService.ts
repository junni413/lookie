import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";


export const workLogService = {
  /**
   * 출근 (업무 시작)
   * POST /api/work-logs/start
   */
  startWork: async (): Promise<void> => {
    await request<ApiResponse<void>>("/api/work-logs/start", {
      method: "POST",
    });
  },

  /**
   * 퇴근 (업무 종료)
   * POST /api/work-logs/end
   */
  endWork: async (): Promise<void> => {
    await request<ApiResponse<void>>("/api/work-logs/end", {
      method: "POST",
    });
  },

  /**
   * 내 현재 업무 상태 확인
   * /api/work-logs/current 를 사용하여 실제 출퇴근 세션 여부 확인
   */
  getMyWorkStatus: async (): Promise<'WORKING' | 'OFF_WORK'> => {
    try {
        const response = await request<ApiResponse<any>>("/api/work-logs/current", {
            method: "GET",
        });
        
        if (!response.success || !response.data) return 'OFF_WORK';
        
        // currentStatus: START, PAUSE, RESUME -> WORKING
        // currentStatus: END -> OFF_WORK
        const status = response.data.currentStatus;
        if (status === 'START' || status === 'RESUME' || status === 'PAUSE' || status === 'WORKING') {
            return 'WORKING';
        }
        return 'OFF_WORK';

    } catch (error) {
        console.error("Failed to check work status:", error);
        return 'OFF_WORK';
    }
  }
};
