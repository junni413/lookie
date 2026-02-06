import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { issueService, type MyIssueResponse } from "@/services/issueService";
import { MapPin, Package, Hash, Calendar, ChevronRight } from "lucide-react";

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
    if (tab === "ALL") return true;
    if (tab === "DONE") return it.status === "RESOLVED";
    return it.status === "OPEN";
  });

  // ✅ Helper: issueType code -> label & style
  const getIssueTypeConfig = (type: string) => {
    switch (type) {
      case "DAMAGED":
        return { label: "파손 이슈", color: "bg-red-50 text-red-600 border-red-100" };
      case "OUT_OF_STOCK":
        return { label: "재고 없음", color: "bg-amber-50 text-amber-600 border-amber-100" };
      default:
        return { label: "알 수 없는 이슈", color: "bg-gray-50 text-gray-500 border-gray-100" };
    }
  };

  return (
    <div className="space-y-5 px-1 py-2">
      {/* 탭 */}
      <div className="flex gap-2">
        <TabButton active={tab === "ALL"} onClick={() => setTab("ALL")}>전체</TabButton>
        <TabButton active={tab === "DONE"} onClick={() => setTab("DONE")}>처리완료</TabButton>
        <TabButton active={tab === "WAIT"} onClick={() => setTab("WAIT")}>대기중</TabButton>
      </div>

      {/* 리스트 */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-gray-400">이슈 목록을 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">신고된 이슈가 없습니다.</div>
        ) : (
          filtered.map((it) => {
            const config = getIssueTypeConfig(it.issueType);
            return (
              <div
                key={it.issueId}
                onClick={() => navigate("/worker/issue/detail", { state: { issue: it } })}
                className="group relative rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
              >
                {/* Header: ID & Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-500">{it.issueId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black ${config.color}`}>
                      {config.label}
                    </span>
                    <StatusPill status={it.status} />
                  </div>
                </div>

                {/* Content: Product & Location */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 bg-slate-50 rounded-xl">
                      <Package className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">상품명</p>
                      <p className="text-base font-black text-slate-900 truncate leading-tight mt-0.5">
                        {it.productName || "상품명 없음"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 bg-blue-50/50 rounded-xl">
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">지번 코드</p>
                      <p className="text-[15px] font-bold text-blue-600 mt-0.5 tracking-tight font-mono">
                        {it.locationCode || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer: Date & Arrow */}
                <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            );
          })
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
