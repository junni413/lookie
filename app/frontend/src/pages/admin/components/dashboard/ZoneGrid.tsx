import type { ZoneStatus } from "@/types/db";
import ZoneCard from "@/components/shared/ZoneCard";

export interface ZoneItem {
  id: number;
  name: string;
  status: ZoneStatus;
  working: number; // 작업자 수
  workRate: number; // 진행률
  openIssueCount?: number;
}

export default function ZoneGrid({ zones, onZoneClick }: { zones: ZoneItem[], onZoneClick?: (id: number) => void }) {

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3 auto-rows-fr h-full">
        {zones.map((z) => {
          return (
            <ZoneCard
              key={z.id}
              name={z.name}
              status={z.status}
              workerCount={z.working}
              workRate={z.workRate}
              openIssueCount={z.openIssueCount}
              onCardClick={() => onZoneClick?.(z.id)}
              titleClassName="text-sm"
              usePieChartIcon
              className="rounded-xl"
            />
          );
        })}
      </div>
    </div>
  );
}
