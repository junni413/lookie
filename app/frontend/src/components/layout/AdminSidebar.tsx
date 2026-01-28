import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";

const items = [
  { to: "/admin/dashboard", label: "대시보드" },
];

export default function AdminSidebar() {
  return (
    <div className="h-full p-4 flex flex-col">
      {/* Brand */}
      <div className="px-2 py-3">
        <div className="text-lg font-semibold">LOOkie</div>
        <div className="text-xs text-muted-foreground">Admin Console</div>
      </div>

      {/* 그냥 div로 구분선 */}
      <div className="my-3 h-px bg-border" />

      {/* Nav */}
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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

      {/* Footer */}
      <div className="mt-auto pt-6">
        <div className="rounded-md bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-sm font-medium">관리자</div>
        </div>
      </div>
    </div>
  );
}
