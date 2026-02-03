import {
    db_issues,
    db_issue_images,
    db_ai_judgments,
    db_users,

    zoneNames
} from "@/mocks/mockData";
import { getDerivedWorker } from "@/mocks/mockData"; // Separated import if needed
import type { IssueResponse } from "@/types/db";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getJoinedIssues = (): IssueResponse[] => {
    return db_issues.map((issue) => {
        // Join Worker Name
        const workerUser = db_users.find(u => u.userId === issue.workerId);
        const workerName = workerUser ? workerUser.name : "알 수 없음";

        // Join Zone Name
        // Mock data now uses db_zones and zoneNames map.
        // issue.zoneLocationId might be the locationId, but for simple display we map to Zone Name.
        // Assume zoneLocationId implies zoneId for now or logic to find zone.
        // In mockData generation, I used zoneId as zoneLocationId proxy.
        const zoneName = zoneNames[issue.zoneLocationId || 1] || "Unknown Zone";

        // Join Images
        const images = db_issue_images.filter((img) => img.issueId === issue.issueId);

        // Join AI Judgment
        const judgment = db_ai_judgments.find((j) => j.issueId === issue.issueId);

        // Join Enhanced Worker Info
        const worker = getDerivedWorker(issue.workerId);

        if (!worker) {
            // Fallback if worker not found (shouldn't happen with correct mock data)
            return {
                ...issue,
                workerName,
                zoneName,
                images,
                judgment: judgment!,
                worker: workerUser as any // Cast or handle error
            } as IssueResponse;
        }

        return {
            ...issue,
            workerName,
            zoneName,
            images,
            judgment: judgment!,
            worker,
        };
    });
};

export const issueService = {
    /**
     * 이슈 목록 조회 (Simulate GET /api/admin/issues)
     */
    getIssues: async (params?: {
        page?: number;
        size?: number;
        status?: "OPEN" | "RESOLVED";
        sort?: "TIME" | "PRIORITY";
    }): Promise<{ data: IssueResponse[]; total: number }> => {
        await delay(500);
        let all = getJoinedIssues();

        // 1. Filter by Status
        if (params?.status) {
            all = all.filter(i => i.status === params.status);
        }

        // 2. Sort
        if (params?.sort) {
            if (params.sort === "PRIORITY") {
                const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                all.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
            } else {
                // TIME (Default)
                if (params.status === "RESOLVED") {
                    all.sort((a, b) => {
                        const timeA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : new Date(a.createdAt).getTime();
                        const timeB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : new Date(b.createdAt).getTime();
                        return timeB - timeA;
                    });
                } else {
                    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                }
            }
        }

        // 3. Pagination
        const page = params?.page || 1;
        const size = params?.size || 10;
        const start = (page - 1) * size;
        const end = start + size;

        const paginated = all.slice(start, end);

        return {
            data: paginated,
            total: all.length
        };
    },

    /**
     * 이슈 상세 조회 (Simulate GET /api/admin/issues/:id)
     */
    getIssueDetail: async (id: number): Promise<IssueResponse | null> => {
        await delay(300);
        const all = getJoinedIssues();
        const issue = all.find((i) => i.issueId === id);
        return issue || null;
    },

    /**
     * 이슈 판정 (Simulate PATCH /api/admin/issues/:id)
     */
    processIssue: async (id: number, decision: "APPROVED" | "REJECTED"): Promise<void> => {
        await delay(800);

        const target = db_issues.find(i => i.issueId === id);
        if (target) {
            target.status = "RESOLVED";
            target.resolvedAt = new Date().toISOString();
            if (decision === "APPROVED") {
                target.issueHandling = "NON_BLOCKING"; // Or equivalent logic
            } else {
                target.issueHandling = "BLOCKING"; // Or logic for rejection
            }
        }
    },
};
