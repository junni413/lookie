import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { LucideIcon } from "lucide-react";

export default function StatusCard({
  title,
  value,
  icon: Icon,
  onClick, // Link handler
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
}) {

  return (
    <Card 
        onClick={onClick}
        className={cn(
            "border-0 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white h-full group ring-1 ring-slate-100/80 relative overflow-hidden",
            onClick ? "cursor-pointer" : ""
        )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="px-8 py-12 flex items-center h-full relative z-10">

        {/* Left: Circular Icon */}
        <div className="shrink-0 w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center text-primary transition-transform group-hover:scale-110">
          <Icon size={26} strokeWidth={2} />
        </div>

        {/* Right: Value & Title */}
        <div className="ml-6 flex flex-col justify-center">
          <span className="text-2xl font-extrabold text-slate-800 leading-tight tracking-tight">{value}</span>
          <span className="text-sm font-medium text-slate-500 mt-0.5">{title}</span>
        </div>

      </div>
    </Card>
  );
}
