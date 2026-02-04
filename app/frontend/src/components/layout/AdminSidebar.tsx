import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ADMIN_MENU } from "@/config/adminMenu";
import { useAuthStore } from "@/stores/authStore";
import { LogOut } from "lucide-react";

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

    </div>
  );
}