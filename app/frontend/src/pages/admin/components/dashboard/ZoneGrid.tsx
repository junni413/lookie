import { Card } from "@/components/ui/card";
import type { ZoneStatus } from "@/mocks/mockData";
import { cn } from "@/utils/cn";
import { Users, PieChart, AlertCircle, Zap } from "lucide-react";

export interface ZoneItem {
  id: number;
  name: string;
  status: ZoneStatus;
  working: number;
  waiting: number;
  done: number;
}

export default function ZoneGrid({ zones }: { zones: ZoneItem[] }) {

  const getStyle = (status: ZoneStatus) => {
    switch (status) {
      case 'NORMAL':
        return {
          card: "bg-white border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
          hover: "hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5",
          title: "text-slate-500",
          itemLabel: "text-slate-400",
          itemValue: "text-slate-700",
          badge: null,
          hasBadge: false
        };
      case 'BUSY':
        return {
          card: "bg-[#FFF9F0] border-orange-100/50 shadow-[0_2px_8px_rgba(251,146,60,0.05)]", // Very subtle orange tint
          hover: "hover:bg-[#FFF4E3] hover:border-orange-200 hover:shadow-[0_4px_12px_rgba(251,146,60,0.1)] hover:-translate-y-0.5",
          title: "text-orange-900/60",
          itemLabel: "text-orange-900/40",
          itemValue: "text-orange-950",
          badge: "bg-white/90 text-orange-600 shadow-sm ring-1 ring-orange-100",
          badgeIcon: <Zap size={10} fill="currentColor" />,
          badgeLabel: "BUSY",
          hasBadge: true
        };
      case 'ISSUE':
        return {
          card: "bg-[#FFF5F5] border-red-100/50 shadow-[0_2px_8px_rgba(244,63,94,0.05)]", // Very subtle red tint
          hover: "hover:bg-[#FFEBEB] hover:border-red-200 hover:shadow-[0_4px_12px_rgba(244,63,94,0.1)] hover:-translate-y-0.5",
          title: "text-rose-900/60",
          itemLabel: "text-rose-900/40",
          itemValue: "text-rose-950",
          badge: "bg-white/90 text-rose-600 shadow-sm ring-1 ring-rose-100",
          badgeIcon: <AlertCircle size={10} />,
          badgeLabel: "ISSUE",
          hasBadge: true
        };
      default:
        return {
          card: "bg-white border-slate-100",
          hover: "",
          title: "text-slate-500",
          itemLabel: "text-slate-400",
          itemValue: "text-slate-700",
          badge: null,
          hasBadge: false
        };
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-4 auto-rows-fr h-full">
        {/* increased gap to 4 for better breathing room */}
        {zones.map((z) => {
          const style = getStyle(z.status);
          const total = z.working + z.waiting + z.done;
          const rate = total > 0 ? Math.round((z.done / total) * 100) : 0;

          return (
            <Card
              key={z.id}
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

              {/* Bottom Row: Balanced Metrics */}
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
                  {/* Soft divider to separate but keep balanced */}
                  <div className={cn("flex items-center gap-1.5 text-xs font-semibold", style.itemLabel)}>
                    <PieChart size={14} />
                    <span>진행률</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-3xl font-bold tracking-tight", style.itemValue)}>{rate}</span>
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