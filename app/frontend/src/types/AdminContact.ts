import type { User } from "@/stores/authStore";

/**
 * 관리자 연락처 정보
 * User 타입을 확장하여 구역 정보 추가
 */
export interface AdminContact extends User {
    assignedZone?: string; // 담당 구역 (예: "Zone A", "Zone B")
    isOnline?: boolean; // 온라인 상태 (Legacy)
    status?: string; // 실시간 상태 (ONLINE, BUSY, PAUSED, AWAY)
}
