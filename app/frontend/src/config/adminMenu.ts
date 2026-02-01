export interface AdminMenuItem {
  label: string;
  path: string;
  description?: string;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    description: "전체 구역의 실시간 현황과 판정 요청을 한눈에 확인합니다."
  },
  {
    label: "Manage",
    path: "/admin/manage",
    description: "각 구역에 작업자를 배치하거나 AI 추천 배치를 적용합니다."
  },
  {
    label: "Issue",
    path: "/admin/issue",
    description: "작업자가 요청한 판정 내역을 검토하고 처리합니다."
  },
  {
    label: "Map",
    path: "/admin/map",
    description: "공장 전체의 구역 배치와 작업자 현황을 시각적으로 모니터링합니다."
  },
];
