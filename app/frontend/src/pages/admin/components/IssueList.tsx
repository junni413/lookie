import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";
import type { AdminIssueItem, IssueType } from "@/mocks/mockData";

type SortKey = "TIME" | "URGENCY";

function IssueTypeBadge({ type }: { type: IssueType }) {
  if (type === "STOCK") {
    // 재고: Alert 컬러(빨강)
    return <Badge className="rounded-full bg-destructive px-4 py-1 text-white hover:bg-destructive">재고</Badge>;
  }
  // 파손: Primary 느낌(파랑)
  return <Badge className="rounded-full bg-primary px-4 py-1 text-white hover:bg-primary">파손</Badge>;
}

function SortPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {children}
    </button>
  );
}

export default function IssueList({ items }: { items: AdminIssueItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("TIME");

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sortKey === "TIME") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // urgency 큰 게 위로(3 > 1)
      arr.sort((a, b) => b.urgency - a.urgency);
    }
    return arr;
  }, [items, sortKey]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">판정 요청 목록</div>
        <div className="flex gap-2">
          <SortPill active={sortKey === "TIME"} onClick={() => setSortKey("TIME")}>
            시간순
          </SortPill>
          <SortPill active={sortKey === "URGENCY"} onClick={() => setSortKey("URGENCY")}>
            긴급도순
          </SortPill>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sorted.map((it) => (
          <button
            key={it.id}
            type="button"
            className={cn(
              "w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition",
              "hover:-translate-y-[1px] hover:shadow-md"
            )}
            onClick={() => {
              // 지금은 정적이니까 클릭만 대비
              // console.log(it.id);
            }}
          >
            <div className="flex items-center gap-4">
              {/* thumbnail placeholder */}
              <div className="h-14 w-14 shrink-0 rounded-xl bg-muted" />

              {/* main text */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{it.workerName}</div>
                <div className="text-sm text-muted-foreground">{it.zoneName}</div>
              </div>

              {/* right meta */}
              <div className="flex items-center gap-3">
                <IssueTypeBadge type={it.type} />
                <div className="text-sm text-muted-foreground">{timeAgo(it.createdAt)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
