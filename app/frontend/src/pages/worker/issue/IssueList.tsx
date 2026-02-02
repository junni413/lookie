import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { taskService, type Issue } from "@/services/taskService";

type Ctx = { setTitle: (t: string) => void };

export default function IssueListPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  useEffect(() => setTitle("이슈 목록 조회"), [setTitle]);

  const [tab, setTab] = useState<"ALL" | "DONE" | "WAIT">("ALL");
  const [data, setData] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const issues = await taskService.getMyIssues();
        setData(issues);
      } catch (err) {
        console.error("Fetch issues error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

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
        {loading ? (
          <div className="py-20 text-center text-gray-400">이슈 목록을 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">신고된 이슈가 없습니다.</div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              onClick={() => navigate("/worker/issue/detail", { state: { issue: it } })}
              className="rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">{it.id}</div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {it.title} - {it.productName}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{it.location}</div>
                </div>

                <StatusPill status={it.status} />
              </div>

              <div className="mt-3 text-xs text-gray-400">{it.createdAt}</div>
            </div>
          ))
        )}
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
