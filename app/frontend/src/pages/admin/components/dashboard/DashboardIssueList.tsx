import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import type { IssueResponse } from "@/types/db";
import IssueListItem from "../issue/IssueListItem";

type SortKey = "TIME" | "PRIORITY";

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

const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function IssueList({ items }: { items: IssueResponse[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("TIME");

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sortKey === "TIME") {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // priority 큰 게 위로 (HIGH > MEDIUM > LOW)
      arr.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
    }
    return arr;
  }, [items, sortKey]);

  return (
    <div className="flex flex-col gap-4 h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="text-base font-semibold">판정 요청 목록</div>
        <div className="flex gap-2">
          <SortPill active={sortKey === "TIME"} onClick={() => setSortKey("TIME")}>
            시간순
          </SortPill>
          <SortPill active={sortKey === "PRIORITY"} onClick={() => setSortKey("PRIORITY")}>
            긴급도순
          </SortPill>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-2">
        {sorted.map((it) => (
          <IssueListItem
            key={it.issue_id}
            issue={it}
          // onClick={() => {
          // }}
          />
        ))}
      </div>
    </div>
  );
}
