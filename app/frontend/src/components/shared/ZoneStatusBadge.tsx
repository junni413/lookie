import type { ZoneStatus } from "@/types/db";
import { cn } from "@/utils/cn";
import { getZoneStyle } from "@/utils/zoneUtils";

interface ZoneStatusBadgeProps {
  status: ZoneStatus;
  className?: string;
}

export default function ZoneStatusBadge({ status, className }: ZoneStatusBadgeProps) {
  const style = getZoneStyle(status);

  if (!style.hasBadge) return null;

  return (
    <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", style.badge, className)}>
      {style.badgeIcon}
      <span>{style.badgeLabel}</span>
    </div>
  );
}
