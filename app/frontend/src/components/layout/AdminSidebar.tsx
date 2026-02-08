import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { ADMIN_MENU } from "@/config/adminMenu";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, Briefcase, Play, Pause, Power } from "lucide-react";
import { workLogService } from "@/services/workLogService";

export default function AdminSidebar() {
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
    <div className="h-full flex flex-col bg-slate-900">
      {/* Brand */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight leading-none">
              LOOkie
            </div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider mt-1 uppercase">Admin Console</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {ADMIN_MENU.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-6 rounded-none px-6 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-primary/15 to-transparent text-primary shadow-none"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                    )} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4">
        <SidebarFooter onLogout={handleLogout} />
      </div>
    </div>
  );
}

interface SidebarFooterProps {
    onLogout: () => void;
}

function SidebarFooter({ onLogout }: SidebarFooterProps) {
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
                    break;
                case 'PAUSE':
                    await workLogService.pauseWork();
                    setStatus('PAUSED');
                    break;
                case 'RESUME':
                    await workLogService.resumeWork();
                    setStatus('WORKING');
                    break;
                case 'END':
                    if (confirm("정말로 퇴근하시겠습니까?")) {
                        await workLogService.endWork();
                        setStatus('OFF_WORK');
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

    return (
        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 space-y-4 shadow-sm">
            {/* Top Row: User Info & Status */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-sm font-bold text-white truncate leading-tight">
                        {user?.name || "관리자"}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                        {user?.email || "admin@lookie.io"}
                    </span>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        status === 'WORKING' ? "bg-primary animate-pulse" : 
                        status === 'PAUSED' ? "bg-amber-500" : "bg-slate-500"
                    )} />
                    <span className={cn(
                        "text-[10px] font-bold",
                        status === 'WORKING' ? "text-primary" : 
                        status === 'PAUSED' ? "text-amber-500" : "text-slate-500"
                    )}>
                        {status === 'WORKING' ? "업무 중" : 
                         status === 'PAUSED' ? "휴식 중" : "퇴근"}
                    </span>
                </div>
            </div>

            {/* Middle Row: Action Buttons */}
            {status !== 'OFF_WORK' ? (
                <div className="grid grid-cols-2 gap-2">
                    {status === 'WORKING' ? (
                        <button
                            onClick={() => handleAction('PAUSE')}
                            disabled={loading}
                            className="h-10 bg-slate-900 hover:bg-slate-800 text-amber-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                            <Pause size={14} fill="currentColor" />
                            휴식
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction('RESUME')}
                            disabled={loading}
                            className="h-10 bg-slate-900 hover:bg-slate-800 text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                            <Play size={14} fill="currentColor" />
                            재개
                        </button>
                    )}
                    
                    <button
                        onClick={() => handleAction('END')}
                        disabled={loading}
                        className="h-10 bg-slate-900 hover:bg-slate-800 text-rose-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    >
                        <Power size={14} />
                        퇴근
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => handleAction('START')}
                    disabled={loading || !user}
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                    <Briefcase size={14} />
                    출근하기
                </button>
            )}

            {/* Bottom Row: Logout */}
            <button
                onClick={onLogout}
                className="w-full h-9 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
                <LogOut size={14} />
                로그아웃
            </button>
        </div>
    );
}
