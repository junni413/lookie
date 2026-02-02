import type { ApiResponse, TaskResponse, TaskVO, TaskItemVO } from "../types/task";

export type IssueStatus = "DONE" | "WAIT";
export interface Issue {
    id: string;
    title: string;
    location: string;
    createdAt: string;
    status: IssueStatus;
    imageUrl?: string;
    productName: string;
    sku: string;
    aiResult?: string; // "MISSING", "WAIT", "ADMIN", "LOCATION_MOVE"
    verdict?: string;  // "OK", "DAMAGED", "NEED_REVIEW"
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 사용자 제공 Mock 데이터
const MOCK_TASK_RESPONSE: TaskResponse<TaskVO> = {
    payload: {
        batchTaskId: 1001,
        batchId: 50,
        zoneId: 5,
        displayZone: "A-2",
        displayLine: "L-05",
        itemCount: 2,
        toteId: 0,
        status: "IN_PROGRESS",
        actionStatus: "SCAN_TOTE",
        startedAt: new Date().toISOString()
    },
    nextAction: "SCAN_TOTE",
    nextItem: undefined
};

const MOCK_ITEMS: TaskItemVO[] = [
    {
        batchTaskItemId: 501,
        batchTaskId: 1001,
        productId: 101,
        productName: "신라면 (5개입)",
        barcode: "8801043014847",
        locationId: 201,
        locationCode: "B-01-01",
        requiredQty: 3,
        pickedQty: 0,
        status: "READY"
    },
    {
        batchTaskItemId: 502,
        batchTaskId: 1001,
        productId: 102,
        productName: "삼다수 2L",
        barcode: "8801104510004",
        locationId: 202,
        locationCode: "B-03-02",
        requiredQty: 1,
        pickedQty: 0,
        status: "READY"
    }
];

export const taskService = {
    /**
     * 작업 할당 및 시작
     */
    startTask: async (): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
        await delay(800);
        return {
            success: true,
            message: "작업이 할당되었습니다.",
            errorCode: "",
            data: MOCK_TASK_RESPONSE
        };
    },

    /**
     * 토트 등록
     */
    scanTote: async (_taskId: number, _barcode: string): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
        await delay(500);
        return {
            success: true,
            message: "",
            errorCode: "",
            data: {
                ...MOCK_TASK_RESPONSE,
                nextAction: "SCAN_LOCATION"
            }
        };
    },

    /**
     * 지번 검증
     */
    scanLocation: async (_taskId: number, _locationCode: string): Promise<ApiResponse<TaskResponse<TaskVO>>> => {
        await delay(500);
        return {
            success: true,
            message: "",
            errorCode: "",
            data: {
                ...MOCK_TASK_RESPONSE,
                nextAction: "SCAN_ITEM"
            }
        };
    },

    /**
     * 상품 식별(스캔) 및 수량 1 증가
     */
    scanItem: async (_taskId: number, barcode: string): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
        await delay(500);
        const item = MOCK_ITEMS.find(i => i.barcode === barcode);
        if (!item) throw new Error("상품을 찾을 수 없습니다.");

        const wasDone = item.status === "DONE";
        const newPickedQty = item.pickedQty + 1;

        // 초과 집품 시뮬레이션
        if (newPickedQty > item.requiredQty) {
            return {
                success: false,
                message: "요구 수량을 초과했습니다.",
                errorCode: "TASK_011",
                data: null as any
            };
        }

        const isNowDone = newPickedQty >= item.requiredQty;

        const updatedItem: TaskItemVO = {
            ...item,
            pickedQty: newPickedQty,
            status: isNowDone ? "DONE" : "READY"
        };
        const idx = MOCK_ITEMS.findIndex(i => i.barcode === barcode);
        MOCK_ITEMS[idx] = updatedItem;

        // 통계 업데이트 (아이템 단위)
        if (!wasDone && isNowDone) {
            const statsStr = localStorage.getItem("work_stats");
            const stats = statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
            stats.done += 1;
            stats.waiting = Math.max(0, stats.waiting - 1);
            localStorage.setItem("work_stats", JSON.stringify(stats));
        }

        return {
            success: true,
            message: "",
            errorCode: "",
            data: {
                payload: updatedItem,
                nextAction: "SCAN_ITEM", // 해당 상품 작업 중에는 상품 스캔 상태 유지
                nextItem: undefined
            }
        };
    },

    /**
     * 상품 수량 수정
     */
    updateQuantity: async (itemId: number, increment: number): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
        await delay(300);
        const item = MOCK_ITEMS.find(i => i.batchTaskItemId === itemId);
        if (!item) throw new Error("상품을 찾을 수 없습니다.");

        const wasDone = item.status === "DONE";
        item.pickedQty = Math.max(0, item.pickedQty + increment);
        item.status = item.pickedQty >= item.requiredQty ? "DONE" : "READY";
        const isNowDone = item.status === "DONE";

        // 통계 업데이트
        if (!wasDone && isNowDone) {
            const statsStr = localStorage.getItem("work_stats");
            const stats = statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
            stats.done += 1;
            stats.waiting = Math.max(0, stats.waiting - 1);
            localStorage.setItem("work_stats", JSON.stringify(stats));
        } else if (wasDone && !isNowDone) {
            const statsStr = localStorage.getItem("work_stats");
            const stats = statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
            stats.done = Math.max(0, stats.done - 1);
            stats.waiting += 1;
            localStorage.setItem("work_stats", JSON.stringify(stats));
        }

        return {
            success: true,
            message: "",
            errorCode: "",
            data: {
                payload: item,
                nextAction: "SCAN_ITEM",
                nextItem: undefined
            }
        };
    },

    /**
     * 상품별 집품 완료
     */
    completeItem: async (itemId: number): Promise<ApiResponse<TaskResponse<TaskItemVO>>> => {
        await delay(300);
        const item = MOCK_ITEMS.find(i => i.batchTaskItemId === itemId);
        if (!item) throw new Error("상품을 찾을 수 없습니다.");

        return {
            success: true,
            message: "",
            errorCode: "",
            data: {
                payload: item,
                nextAction: "SCAN_LOCATION",
                nextItem: undefined
            }
        };
    },

    /**
     * 작업 완료
     */
    completeTask: async (_taskId: number): Promise<ApiResponse<void>> => {
        await delay(1000);

        // Mock 초기화 (반복 테스트용)
        MOCK_ITEMS.forEach(item => {
            item.pickedQty = 0;
            item.status = "READY";
        });

        return {
            success: true,
            message: "작업이 완료되었습니다.",
            errorCode: "",
            data: undefined
        };
    },

    /**
     * 이슈 신고 통계 업데이트 및 이슈 생성
     */
    reportIssue: async (payload?: {
        productName: string;
        sku: string;
        location: string;
        type: string;
        aiResult?: string;
        verdict?: string;
        imageUrl?: string;
    }): Promise<string> => {
        const statsStr = localStorage.getItem("work_stats");
        const stats = statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
        stats.issue += 1;
        localStorage.setItem("work_stats", JSON.stringify(stats));

        // 이슈 목록에도 추가
        const issuesStr = localStorage.getItem("my_issues");
        const issues: Issue[] = issuesStr ? JSON.parse(issuesStr) : [];

        const newId = `ISS-${String(issues.length + 1).padStart(3, '0')}`;
        const newIssue: Issue = {
            id: newId,
            title: payload ? `${payload.type} 신고` : "기타 이슈 신고",
            location: payload ? payload.location : "알 수 없음",
            productName: payload ? payload.productName : "기타 상품",
            sku: payload ? payload.sku : "OTHER",
            createdAt: new Date().toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }),
            status: "WAIT",
            aiResult: payload?.aiResult,
            verdict: payload?.verdict,
            imageUrl: payload?.imageUrl
        };

        issues.unshift(newIssue); // 최신순
        localStorage.setItem("my_issues", JSON.stringify(issues));
        return newId;
    },

    /**
     * 이슈 결과 업데이트
     */
    updateIssueResult: async (id: string, updates: { aiResult?: string; verdict?: string; imageUrl?: string; status?: IssueStatus }): Promise<void> => {
        const issuesStr = localStorage.getItem("my_issues");
        const issues: Issue[] = issuesStr ? JSON.parse(issuesStr) : [];
        const idx = issues.findIndex(it => it.id === id);
        if (idx !== -1) {
            issues[idx] = { ...issues[idx], ...updates };
            localStorage.setItem("my_issues", JSON.stringify(issues));
        }
    },

    /**
     * 이슈 이미지 업로드 시뮬레이션
     */
    uploadIssueImage: async (_issueId: string, _file: File): Promise<void> => {
        await delay(500);
        // 실제로는 파일을 서버에 올리고 URL을 받겠지만, 여기서는 미리보기 URL을 쓴다고 가정하거나 생략
    },

    /**
     * 내 이슈 목록 조회
     */
    getMyIssues: async (): Promise<Issue[]> => {
        await delay(500);
        const issuesStr = localStorage.getItem("my_issues");
        return issuesStr ? JSON.parse(issuesStr) : [];
    },

    /**
     * 오늘의 작업 통계 조회
     */
    getWorkStats: async () => {
        await delay(300);
        const statsStr = localStorage.getItem("work_stats");
        if (!statsStr) {
            const initial = { done: 0, issue: 0, waiting: 0 };
            localStorage.setItem("work_stats", JSON.stringify(initial));
            return initial;
        }
        return JSON.parse(statsStr) as { done: number; issue: number; waiting: number };
    },

    /**
     * 대기 중인 작업 개수 설정/증가
     */
    addWaitingTasks: async (count: number): Promise<void> => {
        const statsStr = localStorage.getItem("work_stats");
        const stats = statsStr ? JSON.parse(statsStr) : { done: 0, issue: 0, waiting: 0 };
        stats.waiting += count;
        localStorage.setItem("work_stats", JSON.stringify(stats));
    },

    /**
     * 작업 아이템 목록 조회
     */
    getTaskItems: async (_taskId: number): Promise<ApiResponse<TaskItemVO[]>> => {
        await delay(500);
        return {
            success: true,
            message: "",
            errorCode: "",
            data: MOCK_ITEMS
        };
    },
};
