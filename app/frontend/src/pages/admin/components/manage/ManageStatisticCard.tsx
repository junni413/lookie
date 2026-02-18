import type { ZoneStatus } from "@/types/db";
import ZoneCard from "@/components/shared/ZoneCard";

interface ManageStatisticCardProps {
    zoneName: string;
    status: ZoneStatus;
    workerCount: number;
    workRate: number;
    openIssueCount?: number;
    remainingDeadlineMinutes?: number;
    estimatedCompletionMinutes?: number;
    isPreview?: boolean;
}

export default function ManageStatisticCard({
    zoneName,
    status,
    workerCount,
    workRate,
    openIssueCount,
    remainingDeadlineMinutes,
    estimatedCompletionMinutes,
    isPreview
}: ManageStatisticCardProps) {
    return (
        <ZoneCard
            name={zoneName}
            status={status}
            workerCount={workerCount}
            workRate={workRate}
            openIssueCount={openIssueCount}
            remainingDeadlineMinutes={remainingDeadlineMinutes}
            estimatedCompletionMinutes={estimatedCompletionMinutes}
            variant="manage"
            previewLabel={isPreview ? "미리보기" : undefined}
        />
    );
}
