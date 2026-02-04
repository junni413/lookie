import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function StatusCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
}) {

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white cursor-pointer h-full group ring-1 ring-slate-100/80 relative overflow-hidden">
      <div className="px-8 py-12 flex items-center h-full">

        {/* Left: Circular Icon */}
        <div className="shrink-0 w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center text-primary transition-transform group-hover:scale-110">
          <Icon size={26} strokeWidth={2} />
        </div>

        {/* Right: Value & Title */}
        <div className="ml-6 flex flex-col justify-center">
          <span className="text-2xl font-extrabold text-slate-800 leading-tight tracking-tight">{value}</span>
          <span className="text-sm font-medium text-slate-500 mt-0.5">{title}</span>
        </div>

        {/* Trend Badge (Absolute Top Right - Subtle) */}
        <div className={cn(
          "absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity",
          trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trendUp ? <TrendingUp size={10} strokeWidth={3} /> : <TrendingDown size={10} strokeWidth={3} />}
          <span>{trend.split(" ")[0]}</span>
        </div>
      </div>
    </Card>
  );
}
