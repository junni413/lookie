// 구역
export type ZoneStatus = "NORMAL" | "BUSY" | "ISSUE";

export const adminDashboardMock = {
  summary: {
    working: 12,
    waiting: 5,
    done: 31,
    progress: 72, // %
  },
  zones: [
    { id: "A", name: "A 존", status: "NORMAL" as ZoneStatus, working: 3, waiting: 1, done: 8 },
    { id: "B", name: "B 존", status: "BUSY" as ZoneStatus, working: 5, waiting: 2, done: 11 },
    { id: "C", name: "C 존", status: "ISSUE" as ZoneStatus, working: 1, waiting: 0, done: 4 },
    { id: "D", name: "D 존", status: "NORMAL" as ZoneStatus, working: 2, waiting: 1, done: 6 },
  ],
};


// 작업자
export type IssueType = "STOCK" | "DAMAGE";
export type IssueUrgency = 1 | 2 | 3; // 3이 가장 긴급
export type AdminIssueItem = {
  id: string;
  workerName: string;
  zoneName: string; // "Zone B"
  type: IssueType;
  urgency: IssueUrgency;
  createdAt: string; // ISO
};

export const adminIssueMock: AdminIssueItem[] = [
  {
    id: "ISSUE-1",
    workerName: "작업자 A",
    zoneName: "Zone B",
    type: "STOCK",
    urgency: 1,
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1m ago
  },
  {
    id: "ISSUE-2",
    workerName: "작업자 B",
    zoneName: "Zone B",
    type: "DAMAGE",
    urgency: 2,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2m ago
  },
  {
    id: "ISSUE-3",
    workerName: "작업자 C",
    zoneName: "Zone B",
    type: "DAMAGE",
    urgency: 3,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12m ago
  },
  {
    id: "ISSUE-4",
    workerName: "작업자 A",
    zoneName: "Zone B",
    type: "DAMAGE",
    urgency: 1,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m ago
  },
];
