import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ADMIN_MENU } from "@/config/adminMenu";

export default function AdminSidebar() {
  return (
    <div className="h-full p-4 flex flex-col">
      {/* Brand */}
      <div className="p-4 mb-2">
        <div className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          LOOkie
        </div>
        <div className="text-xs text-slate-500 font-medium mt-1">Admin Console</div>
      </div>

      <div className="my-2 h-px bg-slate-800/50 mx-4" />

      <nav className="flex-1 space-y-1 mt-4 px-2">
        {ADMIN_MENU.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 translate-x-1"
                  : "text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
              )
            }
          >
            {/* Active Indicator Dot (Optional, or rely on bg) */}
            <span className={cn(
              "mr-3 inline-block h-2 w-2 rounded-full transition-colors",
              (({ isActive }: { isActive: boolean }) => isActive ? "bg-white" : "bg-slate-600 group-hover:bg-slate-400")({ isActive: location.pathname.startsWith(item.path) }) // Simplify inline logic or removed. 
              // Wait, NavLink render prop exposes isActive.
            )} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 px-2 pb-4">
        <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50 flex items-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            A
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Signed in as</div>
            <div className="text-sm font-bold text-slate-200 group-hover:text-white">관리자</div>
          </div>
        </div>
      </div>

    </div>
  );
}