export type IssueType = "DAMAGED" | "MISSING" | "OTHER";
export type AiVerdict = "OK" | "DAMAGED" | "NEED_REVIEW";
export type IssueStatus = "OPEN" | "RESOLVED";

/** Admin Issue Summary (목록용) */
export type AdminIssueSummary = {
  issueId: number;
  issueType: string;
  status: IssueStatus;
  priority?: string;
  productName: string;
  locationCode: string;
  workerName: string;
  zoneName?: string;
  createdAt: string;
  resolvedAt?: string;
  adminRequired?: boolean;
  urgency: number;
  aiDecision?: string;
  adminDecision?: string;
  workerId?: number;
};

/** Admin Issue Detail (상세용) */
export type IssueDetailData = {
  issueId: number;
  issueType?: string;
  status: IssueStatus;
  priority?: string;
  productName?: string;
  locationCode?: string;
  workerName?: string;
  zoneName?: string;
  createdAt?: string;
  resolvedAt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  type?: string;
  aiResult?: string;   // 판정 결과 코드 (PASS, FAIL, NEED_CHECK, RETAKE)
  aiDetail?: string;   // AI 상세 결과 JSON (좌표 정보 등)
  confidence?: number;
  summary?: string;
  adminRequired: boolean;
  adminDecision?: string;
  urgency: number;
  issueHandling?: string;
  reasonCode?: string;
  workerNextAction?: string;
  issueNextAction?: string;
  adminNextAction?: string;
  availableActions?: string[];
};

/** Admin Issue List Request */
export type AdminIssueListRequest = {
  page?: number;
  size?: number;
  status?: IssueStatus;
  sort?: "TIME" | "PRIORITY";
};

/** Admin Issue List Response */
export type AdminIssueListResponse = {
  issues: AdminIssueSummary[];
  paging: {
    total: number;
    page: number;
    size: number;
  };
};
