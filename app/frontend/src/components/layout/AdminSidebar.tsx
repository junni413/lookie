import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ADMIN_MENU } from "@/config/adminMenu";

export default function AdminSidebar() {
  return (
    <div className="h-full p-4 flex flex-col">
      {/* Brand */}
      <div className="p-3">
        <div className="text-lg font-semibold">LOOkie</div>
        <div className="text-xs text-muted-foreground">Admin Console</div>
      </div>

      <div className="my-4 h-px bg-border" />

      <nav className="space-y-1">
        {ADMIN_MENU.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                isActive && "bg-primary/10 text-primary font-medium"
              )
            }
          >
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary/60" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}