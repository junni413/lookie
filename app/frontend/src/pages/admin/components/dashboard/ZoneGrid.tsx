import { Card } from "@/components/ui/card";
import type { ZoneStatus } from "@/types/db";
import { cn } from "@/utils/cn";
import { Users, PieChart } from "lucide-react";
import { getZoneStyle } from "@/utils/zoneUtils";

export interface ZoneItem {
  id: number;
  name: string;
  status: ZoneStatus;
  working: number; // 작업자 수
  workRate: number; // 진행률
}

export default function ZoneGrid({ zones, onZoneClick }: { zones: ZoneItem[], onZoneClick?: (id: number) => void }) {

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-4 auto-rows-fr h-full">
        {zones.map((z) => {
          const style = getZoneStyle(z.status);

          return (
            <Card
              key={z.id}
              onClick={() => onZoneClick?.(z.id)} // Add click handler
              className={cn(
                "transition-all duration-300 ease-out cursor-pointer rounded-xl flex flex-col justify-between p-5 relative overflow-hidden border",
                style.card,
                style.hover
              )}
            >
              {/* Top Row: Title & Badge */}
              <div className="flex justify-between items-start">
                <span className={cn("text-sm font-bold tracking-wider uppercase", style.title)}>
                  {z.name}
                </span>
                {style.hasBadge && (
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", style.badge)}>
                    {style.badgeIcon}
                    <span>{style.badgeLabel}</span>
                  </div>
                )}
              </div>

              {/* Bottom Row: Metrics */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* Metric 1: Workers */}
                <div className="flex flex-col gap-1">
                  <div className={cn("flex items-center gap-1.5 text-xs font-semibold", style.itemLabel)}>
                    <Users size={14} />
                    <span>작업자</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-3xl font-bold tracking-tight", style.itemValue)}>{z.working}</span>
                    <span className={cn("text-sm font-medium opacity-60", style.itemValue)}>명</span>
                  </div>
                </div>

                {/* Metric 2: Progress */}
                <div className="flex flex-col gap-1 pl-4 border-l border-slate-400/10">
                  <div className={cn("flex items-center gap-1.5 text-xs font-semibold", style.itemLabel)}>
                    <PieChart size={14} />
                    <span>진행률</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-3xl font-bold tracking-tight", style.itemValue)}>{Math.floor(z.workRate)}</span>
                    <span className={cn("text-sm font-medium opacity-60", style.itemValue)}>%</span>
                  </div>
                </div>
              </div>

            </Card>
          );
        })}
      </div>
    </div>
  );
}