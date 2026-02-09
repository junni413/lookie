import { LayoutDashboard, Users, AlertCircle, Map, Phone } from "lucide-react";
import type { ElementType } from "react";

export interface AdminMenuItem {
  label: string;
  path: string;
  icon: ElementType;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Manage",
    path: "/admin/manage",
    icon: Users,
  },
  {
    label: "Issue",
    path: "/admin/issue",
    icon: AlertCircle,
  },
  {
    label: "Map",
    path: "/admin/map",
    icon: Map,
  },
  {
    label: "Contact",
    path: "/admin/contact",
    icon: Phone,
  },
];
