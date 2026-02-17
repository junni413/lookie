import type { ZoneStatus } from "@/types/db";
import ZoneCard from "@/components/shared/ZoneCard";

interface ZoneSummaryCardProps {
    zoneName: string;
    workerCount: number;
    workRate: number; // 0-100
    openIssueCount?: number;
    status: ZoneStatus;
    isSelected: boolean;
    onCardClick: () => void; // For Layout Map
    onNameClick: () => void; // For Worker List
}

export default function ZoneSummaryCard({
    zoneName,
    workerCount,
    workRate,
    openIssueCount,
    status,
    isSelected,
    onCardClick,
    onNameClick
}: ZoneSummaryCardProps) {
    return (
        <ZoneCard
            name={zoneName}
            status={status}
            workerCount={workerCount}
            workRate={workRate}
            openIssueCount={openIssueCount}
            onCardClick={onCardClick}
            onNameClick={onNameClick}
            showNameButton
            isSelected={isSelected}
        />
    );
}
