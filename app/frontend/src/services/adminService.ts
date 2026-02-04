import { request } from "@/api/http";
import type { ApiResponse } from "@/api/type";
import type { AdminContact } from "@/types/AdminContact";

// ========================================
// 📡 API 함수
// ========================================

/**
 * 관리자 목록 조회
 * GET /api/control/admins
 */
// API Response Item Type
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

export const adminService = {
    getAdmins,
};
