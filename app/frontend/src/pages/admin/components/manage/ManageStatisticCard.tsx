import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";

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
    // Status color mapping
    const statusColor = {
        NORMAL: "bg-green-500",
        BUSY: "bg-blue-500",
        ISSUE: "bg-red-500"
    };

    return (
        <Card className="border-none shadow-sm h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center justify-between h-full bg-white rounded-xl">
                {/* Header: Zone Name + Status Dot */}
                <div className="w-full flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">{zoneName}</h3>
                    <div className={cn("w-4 h-4 rounded-full", statusColor[status] || "bg-gray-300")} />
                </div>

                {/* Stats Grid */}
                <div className="flex w-full justify-around text-center">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-500">근무자 수</span>
                        <span className="text-xl font-bold text-slate-800">{workerCount}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-500">작업율</span>
                        <span className="text-xl font-bold text-slate-800">{workRate}%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
