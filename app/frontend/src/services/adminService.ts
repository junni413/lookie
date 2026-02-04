import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import type { AdminContact } from "@/types/AdminContact";

// import type { ZoneStat } from "./manageService"; // Reusing ZoneStat or defining new one
// ZoneStat is not used, removing import


// ========================================
// 📡 API Response Types
// ========================================

// Dashboard Summary Code
export interface DashboardSummary {
    working: number;
    waiting: number;
    done: number;
    progress: number;
}

// Server DTO
interface DashboardSummaryDto {
    totalActiveWorkers: number;
    pendingIssues: number;
    completedIssues: number;
    totalProgressRate: number;
    zoneSummaries: any[];
}

// Zone List Response (Extension of ZoneStat maybe?)
export interface AdminZoneResponse {
    zoneId: number;
    name: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    workerCount: number;
    workRate: number;
}

// Admin List Response
interface AdminListResponseItem {
    adminId: number;
    name: string;
    assignedZoneId: number | null;
    zoneName: string;
    currentStatus: string;
}

// API Params
// API Params
interface AdminListParams {
    zoneId?: string;
    name?: string;
}

interface AdminZoneAssignmentRequest {
    workerId: number;
    zoneId: number;
    reason?: string;
}

// Zone Worker DTO (Rich Data)
export interface ZoneWorkerDto {
    workerId: number;
    name: string; // Formatted Name
    workCount: number;
    processingSpeed: number;
    currentTaskProgress: number;
    status: string; // "WORKING", etc.
    webrtcStatus: string; // "AVAILABLE", etc.
}



// ========================================
// 📡 API 함수
// ========================================

/**
 * 대시보드 상단 요약 정보
 * GET /api/control/summary
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
    const response = await request<ApiResponse<DashboardSummaryDto>>("/api/control/summary", {
        method: "GET",
    });

    const dto = response.data;
    if (!dto) return { working: 0, waiting: 0, done: 0, progress: 0 };

    return {
        working: dto.totalActiveWorkers || 0,
        waiting: dto.pendingIssues || 0,
        done: dto.completedIssues || 0,
        progress: dto.totalProgressRate ? Math.floor(dto.totalProgressRate) : 0,
    };
}

/**
 * 대시보드 구역 현황
 * GET /api/control/zones
 */
export async function getZones(): Promise<AdminZoneResponse[]> {
    const response = await request<ApiResponse<AdminZoneResponse[]>>("/api/control/zones", {
        method: "GET",
    });
    return response.data || [];
}

/**
 * 관리자 목록 조회
 * GET /api/control/admins
 */
export async function getAdmins(token: string, params?: AdminListParams): Promise<AdminContact[]> {
    const query = new URLSearchParams();

    // params handling
    if (params?.name) {
        query.append("name", params.name);
    }

    if (params?.zoneId && params.zoneId !== 'all') {
        query.append("zoneId", params.zoneId);
    }

    const queryString = query.toString();
    const url = `/api/control/admins${queryString ? `?${queryString}` : ""}`;

    const response = await request<ApiResponse<AdminListResponseItem[]>>(url, {
        method: "GET",
        token: token,
    });

    const rawData = response.data || [];

    // API 응답(adminId)을 프론트엔드 모델(userId)로 맵핑
    return rawData.map(item => ({
        // User Base Fields
        userId: item.adminId,
        name: item.name,
        email: undefined, // Optional in User
        phoneNumber: "000-0000-0000", // Required in User, using placeholder
        role: "ADMIN" as const,
        isActive: true,
        passwordHash: "", // Required string
        createdAt: new Date().toISOString(), // Required string
        updatedAt: new Date().toISOString(), // Required string
        birthDate: undefined, // Optional in User

        // AdminContact Specific
        assignedZoneId: item.assignedZoneId, // DB_User field
        assignedZone: item.zoneName === 'UNKNOWN' ? undefined : item.zoneName, // UI Display
        isOnline: true, // Always allow call (Requested)
    })) as AdminContact[];
}

/**
 * 관리자 강제 구역 배정
 * POST /api/control/assignments
 */
export async function assignWorkerToZone(workerId: number, zoneId: number, reason?: string): Promise<void> {
    await request<ApiResponse<void>>("/api/control/assignments", {
        method: "POST",
        body: { workerId, zoneId, reason } as AdminZoneAssignmentRequest,
    });
}

/**
 * 구역별 작업자 상세 조회
 * GET /api/control/zones/{zoneId}/workers
 */
export async function getWorkersByZone(zoneId: number): Promise<ZoneWorkerDto[]> {
    const response = await request<ApiResponse<ZoneWorkerDto[]>>(`/api/control/zones/${zoneId}/workers`, {
        method: "GET",
    });
    return response.data || [];
}

export const adminService = {
    getDashboardSummary,
    getZones,
    getAdmins,
    assignWorkerToZone,
    getWorkersByZone,
};
