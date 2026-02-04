import type { AdminIssueSummary, AdminIssueListResponse, IssueDetailData } from "@/types/issue";

export const mockIssueSummaries: AdminIssueSummary[] = [
    {
        issueId: 1,
        issueType: "DAMAGED",
        status: "OPEN",
        urgency: 1, // High
        aiDecision: "FAIL",
        workerId: 101,
        workerName: "김철수",
        productName: "프리미엄 세라믹 화병",
        locationCode: "A-12-04",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    },
    {
        issueId: 2,
        issueType: "OUT_OF_STOCK",
        status: "OPEN",
        urgency: 3, // Medium
        aiDecision: "UNKNOWN",
        workerId: 102,
        workerName: "이영희",
        productName: "유기농 시리얼 500g",
        locationCode: "B-05-01",
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    },
    {
        issueId: 3,
        issueType: "DAMAGED",
        status: "RESOLVED",
        urgency: 2,
        aiDecision: "FAIL",
        adminDecision: "DAMAGED", // Confirmed damaged
        workerId: 103,
        workerName: "박민수",
        productName: "스마트 LED 전구",
        locationCode: "C-01-10",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
        issueId: 4,
        issueType: "DAMAGED",
        status: "RESOLVED",
        urgency: 4, // Low (turned out to be normal)
        aiDecision: "NEED_CHECK",
        adminDecision: "NORMAL", // Confirmed normal
        workerId: 104,
        workerName: "정수진",
        productName: "원목 액자 프레임",
        locationCode: "D-03-02",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 46).toISOString(),
    },
    {
        issueId: 5,
        issueType: "DAMAGED",
        status: "OPEN",
        urgency: 5, // Low confidence
        aiDecision: "NEED_CHECK",
        workerId: 105,
        workerName: "최영호",
        productName: "블루투스 스피커",
        locationCode: "E-09-00",
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    }
];

export const mockIssueDetails: Record<number, IssueDetailData> = {
    1: {
        issueId: 1,
        type: "DAMAGED",
        status: "OPEN",
        issueHandling: "BLOCKING",
        adminRequired: true,
        reasonCode: "CRACK_DETECTED",
        urgency: 1,
        aiResult: "FAIL",
        confidence: 0.98,
        summary: "제품 표면에 심각한 균열이 감지되었습니다.",
        imageUrls: ["https://picsum.photos/seed/issue1/800/600"],
        workerNextAction: "WAIT",
        issueNextAction: "RECHECK",
        adminNextAction: "DECIDE",
        availableActions: ["NORMAL", "DAMAGED"]
    },
    2: {
        issueId: 2,
        type: "OUT_OF_STOCK",
        status: "OPEN",
        issueHandling: "NON_BLOCKING",
        adminRequired: true,
        reasonCode: "EMPTY_SHELF",
        urgency: 3,
        aiResult: "UNKNOWN",
        confidence: 0.65,
        summary: "해당 위치에 상품이 보이지 않습니다. 재고 확인이 필요합니다.",
        imageUrls: ["https://picsum.photos/seed/issue2/800/600"],
        workerNextAction: "SKIP",
        issueNextAction: "NONE",
        adminNextAction: "CHECK_STOCK",
        availableActions: ["NORMAL", "RESTOCK"]
    },
    3: {
        issueId: 3,
        type: "DAMAGED",
        status: "RESOLVED",
        issueHandling: "BLOCKING",
        adminRequired: false,
        reasonCode: "BROKEN_PACKAGING",
        urgency: 2,
        adminDecision: "DAMAGED",
        aiResult: "FAIL",
        confidence: 0.92,
        summary: "포장재 파손이 확인되었습니다.",
        imageUrls: ["https://picsum.photos/seed/issue3/800/600"],
        workerNextAction: "DISCARD",
        issueNextAction: "RESOLVED",
        adminNextAction: "NONE",
        availableActions: []
    },
    4: {
        issueId: 4,
        type: "DAMAGED",
        status: "RESOLVED",
        issueHandling: "NON_BLOCKING",
        adminRequired: false,
        reasonCode: "SCRATCH_SUSPECTED",
        urgency: 4,
        adminDecision: "NORMAL",
        aiResult: "NEED_CHECK",
        confidence: 0.45,
        summary: "미세한 스크래치로 보이나 조명 반사일 수 있습니다.",
        imageUrls: ["https://picsum.photos/seed/issue4/800/600"],
        workerNextAction: "CONTINUE",
        issueNextAction: "RESOLVED",
        adminNextAction: "NONE",
        availableActions: []
    },
    5: {
        issueId: 5,
        type: "DAMAGED",
        status: "OPEN",
        issueHandling: "WAIT_ADMIN",
        adminRequired: true,
        reasonCode: "UNCLEAR_IMAGE",
        urgency: 5,
        aiResult: "NEED_CHECK",
        confidence: 0.30,
        summary: "이미지가 흐릿하여 정확한 판정이 어렵습니다.",
        imageUrls: ["https://picsum.photos/seed/issue5/800/600"],
        workerNextAction: "RETAKE",
        issueNextAction: "RETAKE",
        adminNextAction: "REQUEST_RETAKE",
        availableActions: ["NORMAL", "RETAKE", "DAMAGED"]
    }
};
