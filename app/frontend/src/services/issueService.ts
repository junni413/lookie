import {
    db_issues,
    db_issue_images,
    db_ai_judgments,
    workersMock,
    zonesMock,
    getDerivedWorker,
} from "@/mocks/mockData";
import type { IssueResponse } from "@/types/db";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getJoinedIssues = (): IssueResponse[] => {
    return db_issues.map((issue) => {
        // Join Worker Name
        const workerName = workersMock[issue.worker_id] || "알 수 없음";

        // Join Zone Name
        // In mock, zone_id is number, but old mock used "A", "B".
        // We map 1->"A 존", etc.
        const zone = zonesMock.find((z) => z.id === issue.zone_location_id);
        const zoneName = zone ? zone.name : "Unknown Zone";

        // Join Images
        const images = db_issue_images.filter((img) => img.issue_id === issue.issue_id);

        // Join AI Judgment (Assume 1:1 for simplicity or take latest)
        const judgment = db_ai_judgments.find((j) => j.issue_id === issue.issue_id);

        // Join Enhanced Worker Info
        const worker = getDerivedWorker(issue.worker_id);

        return {
            ...issue,
            workerName,
            zoneName,
            images,
            judgment,
            worker,
        };
    });
};

export const issueService = {
    /**
     * 이슈 목록 조회 (Simulate GET /api/admin/issues)
     */
    getIssues: async (): Promise<IssueResponse[]> => {
        await delay(500);
        return getJoinedIssues();
    },

    /**
     * 이슈 상세 조회 (Simulate GET /api/admin/issues/:id)
     */
    getIssueDetail: async (id: number): Promise<IssueResponse | null> => {
        await delay(300);
        const all = getJoinedIssues();
        const issue = all.find((i) => i.issue_id === id);
        return issue || null;
    },

    /**
     * 이슈 판정 (Simulate PATCH /api/admin/issues/:id)
     * decision을 status 업데이트 또는 required_action 업데이트로 매핑
     */
    processIssue: async (id: number, decision: "APPROVED" | "REJECTED"): Promise<void> => {
        await delay(800);

        // In strict ERD terms, "APPROVED"(정상) -> status: RESOLVED, action: WORKER_CONTINUE
        // "REJECTED"(폐기) -> status: RESOLVED, action: AUTO_RESOLVED (or similar legacy concept)

        const target = db_issues.find(i => i.issue_id === id);
        if (target) {
            target.status = "RESOLVED";
            target.resolved_at = new Date().toISOString();
            if (decision === "APPROVED") {
                target.required_action = "WORKER_CONTINUE";
            } else {
                target.required_action = "AUTO_RESOLVED"; // 폐기완료
            }
        }
    },
};
