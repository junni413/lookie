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



import { Play, Pause, Power, Coffee } from "lucide-react";

// ... (previous imports)

function AttendanceButton() {
    const user = useAuthStore((state) => state.user);
    const [status, setStatus] = useState<'WORKING' | 'PAUSED' | 'OFF_WORK'>('OFF_WORK');
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

    const handleAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'END') => {
        if (!user?.userId) return;
        setLoading(true);
        try {
            switch (action) {
                case 'START':
                    await workLogService.startWork();
                    setStatus('WORKING');
                    alert("출근 처리가 완료되었습니다.");
                    break;
                case 'PAUSE':
                    await workLogService.pauseWork();
                    setStatus('PAUSED');
                    alert("휴식 상태로 변경되었습니다.");
                    break;
                case 'RESUME':
                    await workLogService.resumeWork();
                    setStatus('WORKING');
                    alert("업무를 재개합니다.");
                    break;
                case 'END':
                    if (confirm("정말로 퇴근하시겠습니까?")) {
                        await workLogService.endWork();
                        setStatus('OFF_WORK');
                        alert("퇴근 처리가 완료되었습니다.");
                    }
                    break;
            }
        } catch (error) {
            console.error("Attendance API failed:", error);
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (status === 'OFF_WORK') {
        return (
            <button
                onClick={() => handleAction('START')}
                disabled={loading || !user}
                className={cn(
                    "w-full rounded-lg p-3 flex items-center gap-3 transition-all group border",
                    "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500",
                    loading && "opacity-50 cursor-not-allowed"
                )}
            >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center transition-colors">
                    <Briefcase size={16} />
                </div>
                <div className="flex-1 text-left">
                    <div className="text-xs font-medium opacity-80">현재 퇴근 상태</div>
                    <div className="text-sm font-bold">출근하기</div>
                </div>
            </button>
        );
    }

    return (
        <div className="space-y-2">
            {/* 상태 표시 및 메인 액션 */}
            <div className={cn(
                "w-full rounded-lg p-3 border flex flex-col gap-3",
                status === 'WORKING' 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                    : "bg-blue-500/10 border-blue-500/20 text-blue-500"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center",
                        status === 'WORKING' ? "bg-amber-500/20" : "bg-blue-500/20"
                    )}>
                        {status === 'WORKING' ? <Clock size={16} /> : <Coffee size={16} />}
                    </div>
                    <div>
                        <div className="text-xs font-medium opacity-80">
                            {status === 'WORKING' ? "현재 업무 중" : "현재 휴식 중"}
                        </div>
                        <div className="text-sm font-bold">
                            {status === 'WORKING' ? "열심히 일하는 중" : "잠시 충전 중"}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {status === 'WORKING' ? (
                        <button
                            onClick={() => handleAction('PAUSE')}
                            disabled={loading}
                            className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-xs font-bold py-2 rounded-md flex items-center justify-center gap-1 transition-colors"
                        >
                            <Pause size={12} /> 휴식하기
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction('RESUME')}
                            disabled={loading}
                            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 text-xs font-bold py-2 rounded-md flex items-center justify-center gap-1 transition-colors"
                        >
                            <Play size={12} /> 업무재개
                        </button>
                    )}
                    
                    <button
                        onClick={() => handleAction('END')}
                        disabled={loading}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2 rounded-md flex items-center justify-center gap-1 transition-colors border border-red-500/20"
                    >
                        <Power size={12} /> 퇴근하기
                    </button>
                </div>
            </div>
        </div>
    );
}