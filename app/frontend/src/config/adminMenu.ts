export interface AdminMenuItem {
  label: string;
  path: string;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "대시보드",
    path: "/admin/dashboard",
  },
];
