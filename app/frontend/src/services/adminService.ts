import type { ApiResponse } from "@/api/type";
import type { User } from "@/stores/authStore";

// ========================================
// 🔧 Mock 데이터 설정
// ========================================
// 환경 변수로 자동 전환 (개발: true, 운영: false)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock 관리자 데이터
const MOCK_ADMINS: User[] = [
    {
        user_id: 101,
        name: "김관리",
        phone_number: "010-1234-5678",
        email: "admin1@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 102,
        name: "이매니저",
        phone_number: "010-2345-6789",
        email: "admin2@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 103,
        name: "박감독",
        phone_number: "010-3456-7890",
        email: "admin3@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 104,
        name: "최책임",
        phone_number: "010-4567-8901",
        email: "admin4@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 105,
        name: "정팀장",
        phone_number: "010-5678-9012",
        email: "admin5@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 106,
        name: "강실장",
        phone_number: "010-6789-0123",
        email: "admin6@lookie.com",
        role: "ADMIN",
        is_active: true,
        password_hash: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// ========================================
// 📡 API 함수
// ========================================

/**
 * 관리자 목록 조회 (Mock 또는 실제 API)
 * GET /api/users?role=ADMIN
 */
export async function getAdmins(token: string): Promise<User[]> {
    // Mock 데이터 사용
    if (USE_MOCK) {
        // 실제 API 호출처럼 약간의 지연 추가
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("🔧 [Mock] 관리자 목록 반환:", MOCK_ADMINS.length, "명");
        return MOCK_ADMINS;
    }

    // 실제 API 호출
    const response = await fetch("/api/users?role=ADMIN", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error("관리자 목록 조회 실패");
    }

    const json: ApiResponse<User[]> = await response.json();
    return json.data || [];
}

export const adminService = {
    getAdmins,
};
