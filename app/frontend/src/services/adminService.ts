import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import type { AdminContact } from "@/types/AdminContact";

// import type { ZoneStat } from "./manageService"; // Reusing ZoneStat or defining new one
// ZoneStat is not used, removing import


// ========================================
// ?뱻 API Response Types
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
    zoneSummaries: ZoneOverviewSummaryDto[];
}

// Zone List Response (Extension of ZoneStat maybe?)
export interface AdminZoneResponse {
    zoneId: number;
    name: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    workerCount: number;
    workRate: number;
    openIssueCount?: number;
    remainingDeadlineMinutes?: number;
    estimatedCompletionMinutes?: number;
}

interface ZoneOverviewSummaryDto {
    zoneId: number;
    zoneName: string;
    status: "STABLE" | "NORMAL" | "CRITICAL";
    workerCount: number;
    progressRate: number;
    openIssueCount?: number;
    remainingDeadlineMinutes?: number;
    estimatedCompletionMinutes?: number;
}

export interface ZoneMoveRequest {
    workerId: number;
    toZoneId: number;
}

export interface ZoneSimulationRequest {
    moves: ZoneMoveRequest[];
}

// Admin List Response
interface AdminListResponseItem {
    adminId: number;
    name: string;
    assignedZoneId: number | null;
    zoneName: string;
    currentStatus: string;
    status: string; // [NEW] UserVO status (ONLINE, BUSY, etc.)
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
    webrtcStatus?: string; // "ONLINE", "OFFLINE", "BUSY"
}

// Zone Map Worker DTO
export interface ZoneMapWorkerDto {
    workerId: number;
    name: string;
    lineId: number;
    currentLocationCode: string; // "A-01-001"
    isBottleneck: boolean;
    hasOpenIssue?: boolean;
    openIssueType?: "DAMAGED" | "OUT_OF_STOCK" | string;
    workRate?: number;
}

// ========================================
// ?뱻 API ?⑥닔
// ========================================

/**
 * ??쒕낫???곷떒 ?붿빟 ?뺣낫
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
 * ??쒕낫??援ъ뿭 ?꾪솴
 * GET /api/control/zones
 */
export async function getZones(): Promise<AdminZoneResponse[]> {
    const response = await request<ApiResponse<ZoneOverviewSummaryDto[]>>("/api/control/zones", {
        method: "GET",
    });
    const rawData = response.data || [];
    return rawData.map(item => ({
        zoneId: item.zoneId,
        name: item.zoneName, // Backend sends 'zoneName'
        status: item.status,
        workerCount: item.workerCount,
        workRate: item.progressRate || 0, // Map backend 'progressRate' to frontend 'workRate'
        openIssueCount: item.openIssueCount ?? 0,
        remainingDeadlineMinutes: item.remainingDeadlineMinutes,
        estimatedCompletionMinutes: item.estimatedCompletionMinutes
    }));
}

/**
 * 援ъ뿭 ?꾪솴 ?쒕??덉씠?? * POST /api/control/zones/simulate
 */
export async function simulateZones(moves: ZoneMoveRequest[]): Promise<AdminZoneResponse[]> {
    const response = await request<ApiResponse<ZoneOverviewSummaryDto[]>>("/api/control/zones/simulate", {
        method: "POST",
        body: { moves } as ZoneSimulationRequest,
    });
    const rawData = response.data || [];
    return rawData.map(item => ({
        zoneId: item.zoneId,
        name: item.zoneName,
        status: item.status,
        workerCount: item.workerCount,
        workRate: item.progressRate || 0,
        openIssueCount: item.openIssueCount ?? 0,
        remainingDeadlineMinutes: item.remainingDeadlineMinutes,
        estimatedCompletionMinutes: item.estimatedCompletionMinutes
    }));
}

/**
 * 愿由ъ옄 紐⑸줉 議고쉶
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

    // API ?묐떟(adminId)???꾨줎?몄뿏??紐⑤뜽(userId)濡?留듯븨
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
        isOnline: item.currentStatus === 'ONLINE', // Map from new status field
        status: item.currentStatus, // Real-time status
    })) as AdminContact[];
}

/**
 * 愿由ъ옄 媛뺤젣 援ъ뿭 諛곗젙
 * POST /api/control/assignments
 */
export async function assignWorkerToZone(workerId: number, zoneId: number, reason?: string): Promise<void> {
    await request<ApiResponse<void>>("/api/control/assignments", {
        method: "POST",
        body: { workerId, zoneId, reason } as AdminZoneAssignmentRequest,
    });
}

/**
 * 援ъ뿭蹂??묒뾽???곸꽭 議고쉶
 * GET /api/control/zones/{zoneId}/workers
 */
export async function getWorkersByZone(zoneId: number): Promise<ZoneWorkerDto[]> {
    const response = await request<ApiResponse<ZoneWorkerDto[]>>(`/api/control/zones/${zoneId}/workers`, {
        method: "GET",
    });
    return response.data || [];
}

// Zone Map Response
export interface ZoneMapResponse {
    zoneId: number;
    zoneName: string;
    lines: unknown[]; // We only use workers for now
    workers: ZoneMapWorkerDto[];
}

/**
 * 援ъ뿭 留?議고쉶 (?ㅼ떆媛??꾩튂 & 蹂묐ぉ)
 * GET /api/control/zones/{zoneId}/map
 */
export async function getZoneMap(zoneId: number): Promise<ZoneMapResponse> {
    const response = await request<ApiResponse<ZoneMapResponse>>(`/api/control/zones/${zoneId}/map`, {
        method: "GET",
    });
    return response.data || { zoneId, zoneName: "", lines: [], workers: [] };
}

/**
 * ?꾩튂 肄붾뱶 ?뚯떛 ?좏떥由ы떚 (以묒븰 吏묒쨷??
 * ?? "A-01-001" -> { lineNumber: 1, binNumber: 1 }
 */
export function parseLocationCode(code: string | null): { lineNumber: number; binNumber: number } {
    if (!code) return { lineNumber: 0, binNumber: 0 };

    const compact = code.trim();

    const lFormat = compact.match(/-L(\d+)-(\d+)$/i);
    if (lFormat) {
        return {
            lineNumber: parseInt(lFormat[1], 10) || 0,
            binNumber: parseInt(lFormat[2], 10) || 0,
        };
    }

    const classicFormat = compact.match(/^[A-Z]-([0-9]+)-([0-9]+)$/i);
    if (classicFormat) {
        return {
            lineNumber: parseInt(classicFormat[1], 10) || 0,
            binNumber: parseInt(classicFormat[2], 10) || 0,
        };
    }

    const nums = compact.match(/\d+/g) || [];
    if (nums.length >= 2) {
        return {
            lineNumber: parseInt(nums[nums.length - 2], 10) || 0,
            binNumber: parseInt(nums[nums.length - 1], 10) || 0,
        };
    }

    return { lineNumber: 0, binNumber: 0 };
}

export const adminService = {
    getDashboardSummary,
    getZones,
    simulateZones,
    getAdmins,
    assignWorkerToZone,
    getWorkersByZone,
    getWorkerHoverInfo,
    getZoneMap,
    parseLocationCode,
};

// ... (Existing interfaces)

// Worker Hover Info
export interface WorkerHoverInfo {
    workerId: number;
    name: string;
    currentZoneName: string | null;
    currentLocationCode: string | null;
    todayWorkCount: number;
    recentIssueType: string | null;
    recentIssueId: number | null;
}

/**
 * ?묒뾽???몃쾭 ?뺣낫 議고쉶
 * GET /api/control/workers/{workerId}/hover
 */
export async function getWorkerHoverInfo(workerId: number): Promise<WorkerHoverInfo> {
    const response = await request<ApiResponse<WorkerHoverInfo>>(`/api/control/workers/${workerId}/hover`, {
        method: "GET",
    });
    // Ensure all fields are present (safety fallback)
    return response.data || {
        workerId,
        name: "Unknown",
        currentZoneName: "-",
        currentLocationCode: "-",
        todayWorkCount: 0,
        recentIssueType: null,
        recentIssueId: null
    };
}

