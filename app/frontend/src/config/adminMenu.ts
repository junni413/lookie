export interface AdminMenuItem {
  label: string;
  path: string;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
  },
  {
    label: "Manage",
    path: "/admin/manage",
  },
  {
    label: "Issue",
    path: "/admin/issue",
  },
  {
    label: "Map",
    path: "/admin/map",
  },
];
