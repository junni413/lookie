export type IssueStatus = "OPEN" | "RESOLVED";
export type IssueType = "DAMAGED" | "OUT_OF_STOCK";

// API Request Types
export interface AdminIssueListRequest {
    status: IssueStatus;
    page?: number;
    size?: number;
}

// API Response Types matching Backend DTOs
export interface AdminIssueSummary {
    issueId: number;
    issueType: IssueType;
    status: IssueStatus;
    urgency: number; // 1-5
    aiDecision?: string; // Latest AI Judgment
    adminDecision?: string; // Only for RESOLVED

    // Worker Info
    workerId: number;
    workerName: string;

    // Product Info
    productName: string;

    // Location Info
    locationCode: string;

    createdAt: string; // ISO string
    resolvedAt?: string; // ISO string
}

export interface AdminIssueListResponse {
    issues: AdminIssueSummary[];
    paging: {
        page: number;
        size: number;
        totalCount: number;
        totalPages: number;
    };
}

// Detail Response
export interface IssueDetailData {
    // Issue Basic Info
    issueId: number;
    type: IssueType;
    status: IssueStatus;
    issueHandling: string;
    adminRequired: boolean;
    reasonCode: string;

    // New Policy Fields
    urgency: number;
    adminDecision?: string;

    // AI Judgment
    aiResult?: string;
    confidence?: number;
    summary?: string;

    // Calculated Actions
    workerNextAction?: string;
    issueNextAction?: string;
    adminNextAction?: string;
    availableActions?: string[];

    // Images (Backend dev is adding this)
    imageUrls?: string[];
}
