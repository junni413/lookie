import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { Users, Activity } from "lucide-react";

interface ManageStatisticCardProps {
    zoneName: string;
    status: "NORMAL" | "BUSY" | "ISSUE";
    workerCount: number;
    workRate: number;
}

export default function ManageStatisticCard({
    zoneName,
    status,
    workerCount,
    workRate
}: ManageStatisticCardProps) {
    const statusDot = {
        NORMAL: "bg-emerald-500",
        BUSY: "bg-amber-500",
        ISSUE: "bg-rose-500"
    };

    return (
        <Card className="border-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] bg-white rounded-2xl h-full transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">{zoneName}</h3>
                    <div className={cn("w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-white", statusDot[status])} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-400 mb-0.5">Workers</span>
                        <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-slate-300" />
                            <span className="text-xl font-bold text-slate-700 tracking-tight">{workerCount}</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-400 mb-0.5">Rate</span>
                        <div className="flex items-center gap-1.5">
                            <Activity size={14} className="text-slate-300" />
                            <span className="text-xl font-bold text-slate-700 tracking-tight">{workRate}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
