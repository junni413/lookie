import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

type Ctx = { setTitle: (t: string) => void };

type IssueStatus = "DONE" | "WAIT";
type Issue = {
  id: string;
  title: string;
  location: string;
  createdAt: string;
  status: IssueStatus;
};

export default function IssueListPage() {
  const { setTitle } = useOutletContext<Ctx>();
  useEffect(() => setTitle("이슈 목록 조회"), [setTitle]);

  const [tab, setTab] = useState<"ALL" | "DONE" | "WAIT">("ALL");

  const data = useMemo<Issue[]>(
    () => [
      {
        id: "ISS-001",
        title: "K365 | 유리병 파손",
        location: "SKU-88742-1KR",
        createdAt: "2026.01.26 10:32",
        status: "WAIT",
      },
      {
        id: "ISS-002",
        title: "K365 | 유리병 파손",
        location: "SKU-88742-1KR",
        createdAt: "2026.01.26 10:32",
        status: "DONE",
      },
    ],
    []
  );

  const filtered = data.filter((it) => {
    if (tab === "ALL") return true;
    if (tab === "DONE") return it.status === "DONE";
    return it.status === "WAIT";
  });

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-2">
        <TabButton active={tab === "ALL"} onClick={() => setTab("ALL")}>
          전체
        </TabButton>
        <TabButton active={tab === "DONE"} onClick={() => setTab("DONE")}>
          처리완료
        </TabButton>
        <TabButton active={tab === "WAIT"} onClick={() => setTab("WAIT")}>
          대기중
        </TabButton>
      </div>

      {/* 리스트 */}
      <div className="space-y-3">
        {filtered.map((it) => (
          <div key={it.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">{it.id}</div>
                <div className="mt-1 font-semibold text-gray-900">{it.title}</div>
                <div className="mt-1 text-sm text-gray-500">{it.location}</div>
              </div>

              <StatusPill status={it.status} />
            </div>

            <div className="mt-3 text-xs text-gray-400">{it.createdAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 px-4 rounded-full text-sm font-semibold border transition",
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: "DONE" | "WAIT" }) {
  const isDone = status === "DONE";
  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
        isDone ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600",
      ].join(" ")}
    >
      {isDone ? "처리완료" : "대기중"}
    </span>
  );
}
