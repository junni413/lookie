import { CheckCircle, Activity, AlertCircle } from "lucide-react";
import type { ZoneStatus } from "@/types/db";

export const getZoneStyle = (status: ZoneStatus) => {
    switch (status) {
        case 'STABLE':
            return {
                card: "bg-emerald-50 border-emerald-100/50 shadow-[0_2px_8px_rgba(16,185,129,0.05)]", // Green (Stable)
                hover: "hover:bg-emerald-100/50 hover:border-emerald-200 hover:shadow-[0_4px_12px_rgba(16,185,129,0.1)] hover:-translate-y-0.5",
                active: "border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_4px_12px_rgba(16,185,129,0.08)] bg-emerald-50",
                title: "text-emerald-900/60",
                itemLabel: "text-emerald-900/40",
                itemValue: "text-emerald-950",
                badge: "bg-emerald-100 text-emerald-700 shadow-sm",
                badgeIcon: <CheckCircle size={10} />,
                badgeLabel: "안정",
                actionButton: "hover:bg-emerald-200/50 hover:text-emerald-700",
                hasBadge: true
            };
        case 'NORMAL':
            return {
                card: "bg-[#FFF9F0] border-orange-100/50 shadow-[0_2px_8px_rgba(251,146,60,0.05)]", // Orange (Good)
                hover: "hover:bg-[#FFF4E3] hover:border-orange-200 hover:shadow-[0_4px_12px_rgba(251,146,60,0.1)] hover:-translate-y-0.5",
                active: "border-orange-400/40 shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_4px_12px_rgba(251,146,60,0.08)] bg-[#FFF9F0]",
                title: "text-orange-900/60",
                itemLabel: "text-orange-900/40",
                itemValue: "text-orange-950",
                badge: "bg-orange-100 text-orange-700 shadow-sm",
                badgeIcon: <Activity size={10} />,
                badgeLabel: "양호",
                actionButton: "hover:bg-orange-200/50 hover:text-orange-700",
                hasBadge: true
            };
        case 'CRITICAL':
            return {
                card: "bg-[#FFF5F5] border-red-100/50 shadow-[0_2px_8px_rgba(244,63,94,0.05)]", // Red (Issue)
                hover: "hover:bg-[#FFEBEB] hover:border-red-200 hover:shadow-[0_4px_12px_rgba(244,63,94,0.1)] hover:-translate-y-0.5",
                active: "border-rose-400/40 shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_4px_12px_rgba(244,63,94,0.08)] bg-[#FFF5F5]",
                title: "text-rose-900/60",
                itemLabel: "text-rose-900/40",
                itemValue: "text-rose-950",
                badge: "bg-rose-100 text-rose-700 shadow-sm",
                badgeIcon: <AlertCircle size={10} />,
                badgeLabel: "주의",
                actionButton: "hover:bg-rose-200/50 hover:text-rose-700",
                hasBadge: true
            };
        default:
            return {
                card: "bg-white border-slate-100",
                hover: "",
                active: "border-slate-300 shadow-md",
                title: "text-slate-500",
                itemLabel: "text-slate-400",
                itemValue: "text-slate-700",
                badge: "bg-slate-100 text-slate-500",
                badgeIcon: null,
                badgeLabel: "-",
                actionButton: "hover:bg-slate-100 hover:text-slate-900",
                hasBadge: false
            };
    }
};
