import type { AdminContact } from "@/types/AdminContact";
import { Phone } from "lucide-react";
import { cn } from "@/utils/cn";

interface AdminListItemProps {
    admin: AdminContact;
    assignedZone?: string;
    isOnline?: boolean;
    onCallClick: (admin: AdminContact) => void;
}

export default function AdminListItem({
    admin,
    assignedZone,
    isOnline = false,
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
                {/* 온라인 상태 표시 */}
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                )}
            </div>

            {/* 정보 영역 */}
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">
                    {admin.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                    {assignedZone || "담당 구역 없음"}
                </div>
            </div>

            {/* 통화 버튼 */}
            <button
                onClick={() => onCallClick(admin)}
                disabled={!isOnline}
                className={cn(
                    "h-9 w-9 rounded-full transition-all flex items-center justify-center",
                    isOnline
                        ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        : "text-slate-300 cursor-not-allowed"
                )}
            >
                <Phone size={16} fill="currentColor" />
            </button>
        </div>
    );
}
