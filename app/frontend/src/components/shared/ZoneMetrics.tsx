import { Users, Activity, PieChart } from "lucide-react";
import { cn } from "@/utils/cn";

interface ZoneMetricsProps {
  workerCount: number;
  workRate: number;
  labelClassName?: string;
  valueClassName?: string;
  unitClassName?: string;
  usePieChartIcon?: boolean;
  showDivider?: boolean;
}

export default function ZoneMetrics({
  workerCount,
  workRate,
  labelClassName,
  valueClassName,
  unitClassName,
  usePieChartIcon = false,
  showDivider = true
}: ZoneMetricsProps) {
  const ProgressIcon = usePieChartIcon ? PieChart : Activity;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", labelClassName)}>
          <Users size={14} />
          <span>작업자</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{workerCount}</span>
          <span className={cn("text-sm font-medium opacity-60", valueClassName, unitClassName)}>명</span>
        </div>
      </div>

      <div className={cn("flex flex-col gap-1", showDivider && "pl-4 border-l border-slate-400/10")}>
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", labelClassName)}>
          <ProgressIcon size={14} />
          <span>진행률</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{Math.floor(workRate)}</span>
          <span className={cn("text-sm font-medium opacity-60", valueClassName, unitClassName)}>%</span>
        </div>
      </div>
    </div>
  );
}
