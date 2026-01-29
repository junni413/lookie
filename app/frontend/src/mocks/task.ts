export type AssignedTask = {
  zone: string; // A-2
  line: string; // L-05
  count: number; // 24
  toteId?: string; // 선택: 토트 번호 등
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockAssignTask(): Promise<AssignedTask> {
  // 로딩 연출용
  await wait(900);

  // 더미 데이터 (원하면 랜덤도 가능)
  return { zone: "A-2", line: "L-05", count: 24, toteId: "T-1203" };
}
