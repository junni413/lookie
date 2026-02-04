import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { ADMIN_MENU } from "@/config/adminMenu";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, Briefcase, Clock } from "lucide-react";
import { workLogService } from "@/services/workLogService";

export default function AdminSidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Brand */}
      <div className="mb-8">
        <div className="text-2xl font-bold text-white tracking-tight">
          LOOkie
        </div>
        <div className="text-xs text-slate-500 font-medium mt-1">Admin Console</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {ADMIN_MENU.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-2">
        {/* User Info */}
        <div className="rounded-lg bg-slate-800/30 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm font-semibold text-slate-200 truncate">{user?.name || "관리자"}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-slate-800/30 p-3 flex items-center gap-3 hover:bg-red-500/10 transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
            <LogOut size={16} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-slate-300 group-hover:text-red-400 transition-colors">로그아웃</div>
          </div>
        </button>
      </div>

      {/* Attendance Button (Absolute or placed above footer) */}
      <div className="mt-4 border-t border-slate-700/50 pt-4">
          <AttendanceButton />
      </div>

    </div>
  );
}



function AttendanceButton() {
    const user = useAuthStore((state) => state.user);
    const [status, setStatus] = useState<'WORKING' | 'OFF_WORK'>('OFF_WORK');
    const [loading, setLoading] = useState(false);

    // Initial Status Check
    useEffect(() => {
        const checkStatus = async () => {
            if (user?.userId) {
                const current = await workLogService.getMyWorkStatus();
                setStatus(current);
            }
        };
        checkStatus();
    }, [user?.userId]);

    const toggleWorkStatus = async () => {
        if (!user?.userId) return;
        setLoading(true);
        try {
            if (status === 'OFF_WORK') {
                await workLogService.startWork();
                setStatus('WORKING');
                alert("출근 처리가 완료되었습니다.");
            } else {
                await workLogService.endWork();
                setStatus('OFF_WORK');
                alert("퇴근 처리가 완료되었습니다.");
            }
            // Re-verify status just in case (optional, but safer)
            const current = await workLogService.getMyWorkStatus();
            setStatus(current);

        } catch (error) {
            console.error("Attendance API failed:", error);
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleWorkStatus}
            disabled={loading || !user}
            className={cn(
                "w-full rounded-lg p-3 flex items-center gap-3 transition-all group border",
                status === 'WORKING' 
                    ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-500" 
                    : "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500",
                loading && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                status === 'WORKING' ? "bg-amber-500/20" : "bg-emerald-500/20"
            )}>
                {status === 'WORKING' ? <Clock size={16} /> : <Briefcase size={16} />}
            </div>
            <div className="flex-1 text-left">
                <div className="text-xs font-medium opacity-80">
                    {status === 'WORKING' ? "현재 업무 중" : "현재 휴식 중"}
                </div>
                <div className="text-sm font-bold">
                    {status === 'WORKING' ? "퇴근하기" : "출근하기"}
                </div>
            </div>
        </button>
    );
}