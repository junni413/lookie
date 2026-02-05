import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { issueService, type MyIssueResponse } from "@/services/issueService";

type Ctx = { setTitle: (t: string) => void };

// ✅ IssueType 통일: DAMAGED | OUT_OF_STOCK
export type IssueType = "DAMAGED" | "OUT_OF_STOCK";

export default function IssueListPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  useEffect(() => setTitle("이슈 목록 조회"), [setTitle]);

  const [tab, setTab] = useState<"ALL" | "DONE" | "WAIT">("ALL");
  const [data, setData] = useState<MyIssueResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await issueService.getMyIssues();
        if (res.success && res.data) {
          setData(res.data);
        } else {
          console.error("Failed to fetch issues:", res.message);
        }
      } catch (err) {
        console.error("Fetch issues error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const filtered = data.filter((it) => {
    // API status: "OPEN" | "RESOLVED"
    // Tab: "ALL" | "DONE" (RESOLVED) | "WAIT" (OPEN)
    if (tab === "ALL") return true;
    if (tab === "DONE") return it.status === "RESOLVED";
    return it.status === "OPEN";
  });

  // ✅ Helper: issueType code -> label (OUT_OF_STOCK 반영)
  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case "DAMAGED":
        return "파손 이슈";
      case "OUT_OF_STOCK":
        return "재고 없음";
      default:
        return type;
    }
  };

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
          <div className="py-20 text-center text-gray-400">
            이슈 목록을 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            신고된 이슈가 없습니다.
          </div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.issueId}
              onClick={() =>
                navigate("/worker/issue/detail", { state: { issue: it } })
              }
              className="rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">#{it.issueId}</div>
                  <div className="mt-1 font-bold text-lg text-gray-900 truncate">
                    {it.productName || "상품명 없음"}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium text-gray-600">
                      {it.locationCode || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusPill status={it.status} />
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    {getIssueTypeLabel(it.issueType)}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                {new Date(it.createdAt).toLocaleString()}
              </div>
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
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const isDone = status === "RESOLVED";
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
