export type TaskStatus = 'UNASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskActionStatus =
    | 'SCAN_TOTE'
    | 'SCAN_LOCATION'
    | 'SCAN_ITEM'
    | 'ADJUST_QUANTITY'
    | 'COMPLETE_TASK';

export type NextAction =
    | 'SCAN_TOTE'
    | 'SCAN_LOCATION'
    | 'SCAN_ITEM'
    | 'ADJUST_QUANTITY'
    | 'NEXT_ITEM'
    | 'COMPLETE_TASK'
    | 'UPLOAD_IMAGE'
    | 'AI_JUDGING'
    | 'SHOW_AI_RESULT'
    | 'WAIT_ADMIN'
    | 'NONE';

export interface TaskVO {
    batchTaskId: number;
    batchId: number;
    zoneId: number;
    assignedZoneId?: number; // UI 매핑용 (Home과 통일)
    workerId?: number;
    toteId?: number;
    status: TaskStatus;
    startedAt?: string;
    completedAt?: string;
    currentLocationId?: number;
    toteScannedAt?: string;
    toteReleasedAt?: string;
    actionStatus: TaskActionStatus;
    locationScannedAt?: string;
    // UI 전역 표시를 위한 추가 필드
    displayZone?: string;
    displayLine?: string;
    itemCount?: number;
}

export type TaskErrorCode =
    | "TASK_001" // 이미 할당된 작업
    | "TASK_002" // 이미 완료된 작업
    | "TASK_003" // 작업을 찾을 수 없습니다
    | "TASK_004" // 할당 가능한 작업이 없습니다
    | "TASK_005" // 작업 상태 전이가 올바르지 않습니다
    | "TASK_006" // 토트 바코드가 일치하지 않습니다
    | "TASK_007" // 지시된 지번과 일치하지 않습니다
    | "TASK_009" // 미완료된 아이템이 있어 작업을 완료할 수 없습니다
    | "TASK_010" // 이미 진행 중인 작업이 있습니다
    | "TASK_011" // 요구 수량을 초과하여 집품할 수 없습니다
    | "TASK_012" // 요구 수량을 모두 채워야 완료할 수 있습니다
    | "TASK_013"; // 현재 작업에 할당된 상품이 아닙니다

export const TASK_ERROR_MESSAGES: Record<TaskErrorCode, string> = {
    TASK_001: "이미 할당된 작업입니다.",
    TASK_002: "이미 완료된 작업입니다.",
    TASK_003: "작업을 찾을 수 없습니다.",
    TASK_004: "할당 가능한 작업이 없습니다.",
    TASK_005: "작업 상태 전이가 올바르지 않습니다.",
    TASK_006: "토트 바코드가 일치하지 않습니다.",
    TASK_007: "지시된 지번과 일치하지 않습니다.",
    TASK_009: "미완료된 아이템이 있어 작업을 완료할 수 없습니다.",
    TASK_010: "이미 진행 중인 작업이 있습니다.",
    TASK_011: "요구 수량을 초과하여 집품할 수 없습니다.",
    TASK_012: "요구 수량을 모두 채워야 완료할 수 있습니다.",
    TASK_013: "현재 작업에 할당된 상품이 아닙니다.",
};

export interface TaskItemVO {
    batchTaskItemId: number;
    batchTaskId: number;
    productId: number;
    locationId: number;
    requiredQty: number;
    pickedQty: number;
    status: string; // PENDING, DONE, ISSUE
    completedAt?: string;
    lastScannedAt?: string;
    productName: string;
    productImage?: string;
    barcode: string;
    locationCode: string;
    issueType?: string;
    adminDecision?: string;
}

export interface TaskResponse<T> {
    payload: T;
    nextAction: NextAction;
    nextItem?: TaskItemVO;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    errorCode?: string;
    data: T;
}
