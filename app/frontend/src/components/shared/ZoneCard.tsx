import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { ZoneStatus } from "@/types/db";
import { getZoneStyle } from "@/utils/zoneUtils";
import ZoneStatusBadge from "@/components/shared/ZoneStatusBadge";
import ZoneMetrics from "@/components/shared/ZoneMetrics";
import { Users } from "lucide-react";

interface ZoneCardProps {
  name: string;
  status: ZoneStatus;
  workerCount: number;
  workRate: number;
  openIssueCount?: number;
  remainingDeadlineMinutes?: number;
  estimatedCompletionMinutes?: number;
  onCardClick?: () => void;
  onNameClick?: () => void;
  isSelected?: boolean;
  titleClassName?: string;
  usePieChartIcon?: boolean;
  showNameButton?: boolean;
  className?: string;
  variant?: "default" | "manage";
  previewLabel?: string;
}

export default function ZoneCard({
  name,
  status,
  workerCount,
  workRate,
  openIssueCount,
  remainingDeadlineMinutes,
  estimatedCompletionMinutes,
  onCardClick,
  onNameClick,
  isSelected = false,
  titleClassName,
  usePieChartIcon = false,
  showNameButton = false,
  className,
  variant = "default",
  previewLabel
}: ZoneCardProps) {
  const style = getZoneStyle(status);
  const formatMinutes = (value?: number) => {
    if (value == null || Number.isNaN(value)) return "-";
    const rounded = Math.max(0, Math.round(value));
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    if (h === 0) return `${m}분`;
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNameClick?.();
  };

  if (variant === "manage") {
    return (
      <Card
        className={cn(
          "border-0 shadow-sm transition-all duration-300 bg-white rounded-2xl h-full ring-1 ring-slate-100 cursor-pointer overflow-hidden relative",
          className
        )}
        onClick={onCardClick}
      >
        <div className="p-5 h-full flex items-center gap-4 relative z-10">
          <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 shadow-[0_2px_8px_-3px_rgba(99,102,241,0.15)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-600 tracking-tighter">
              {(name || "").replace(/^zone\s*/i, "")}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center h-full gap-3">
            <div className="flex justify-end items-start gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-slate-50 text-slate-700 border border-slate-200/70 shadow-sm">
                이슈 {openIssueCount ?? 0}
              </span>
              {previewLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200/70 shadow-sm">
                  {previewLabel}
                </span>
              )}
              <ZoneStatusBadge status={status} className="px-2.5 py-1 shadow-sm transition-colors" />
            </div>

            <ZoneMetrics
              workerCount={workerCount}
              workRate={workRate}
              labelClassName="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5"
              valueClassName="text-lg font-extrabold text-slate-700 leading-none"
              unitClassName="text-xs font-semibold text-slate-400"
              showDivider
            />
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
                남은 마감 {formatMinutes(remainingDeadlineMinutes)}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                예상 완료 {formatMinutes(estimatedCompletionMinutes)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 ease-out flex flex-col justify-between p-5 relative overflow-hidden border h-full",
        style.card,
        !isSelected && style.hover,
        isSelected && cn("scale-[1.01]", style.active),
        className
      )}
      onClick={onCardClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold tracking-wider uppercase transition-colors", style.title, titleClassName)}>
            {name}
          </span>
          {showNameButton && (
            <button
              onClick={handleNameClick}
              className={cn("p-1 rounded-full text-slate-400 transition-colors z-10", style.actionButton)}
              title="작업자 목록 열기"
            >
              <Users size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200/70">
            이슈 {openIssueCount ?? 0}
          </span>
          <ZoneStatusBadge status={status} />
        </div>
      </div>

      <div className="mt-4">
        <ZoneMetrics
          workerCount={workerCount}
          workRate={workRate}
          labelClassName={style.itemLabel}
          valueClassName={style.itemValue}
          usePieChartIcon={usePieChartIcon}
        />
      </div>
    </Card>
  );
}
