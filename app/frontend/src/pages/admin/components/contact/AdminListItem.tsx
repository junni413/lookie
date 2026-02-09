import type { AdminContact } from "@/types/AdminContact";
import { Phone } from "lucide-react";
import { cn } from "@/utils/cn";

interface AdminListItemProps {
    admin: AdminContact;
    assignedZone?: string;
    onCallClick: (admin: AdminContact) => void;
}

export default function AdminListItem({
    admin,
    assignedZone,
    onCallClick,
}: AdminListItemProps) {
    const initial = admin.name.charAt(0).toUpperCase();

    return (
        <div className="group flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
            {/* 프로필 아바타 */}
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {initial}
                </div>
                {/* 실시간 상태 표시 */}
                <div className={cn(
                    "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors",
                    admin.status === 'ONLINE' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    admin.status === 'BUSY' ? "bg-rose-500" :
                    admin.status === 'PAUSED' ? "bg-amber-400" :
                    "bg-slate-300"
                )} />
            </div>

            {/* 정보 영역 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 truncate">{admin.name}</span>
                    <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        admin.status === 'ONLINE' ? "bg-emerald-100 text-emerald-700" :
                        admin.status === 'BUSY' ? "bg-rose-100 text-rose-700" :
                        admin.status === 'PAUSED' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                    )}>
                        {admin.status === 'ONLINE' ? "통화 가능" :
                         admin.status === 'BUSY' ? "통화 중" :
                         admin.status === 'PAUSED' ? "휴식 중" : "자리 비움"}
                    </span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                    {assignedZone || "담당 구역 없음"}
                </div>
            </div>

            {/* 통화 버튼 */}
            <button
                onClick={() => onCallClick(admin)}
                disabled={admin.status !== 'ONLINE'}
                className={cn(
                    "h-9 w-9 rounded-full transition-all flex items-center justify-center",
                    admin.status === 'ONLINE'
                        ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm border border-emerald-100"
                        : "text-slate-300 bg-slate-50 cursor-not-allowed grayscale"
                )}
            >
                <Phone size={16} fill="currentColor" />
            </button>
        </div>
    );
}
