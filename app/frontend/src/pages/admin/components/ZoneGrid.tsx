import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ZoneStatus } from "@/mocks/mockData";

export interface ZoneItem {
  id: string;
  name: string;
  status: ZoneStatus;
  working: number;
  waiting: number;
  done: number;
}

function StatusBadge({ status }: { status: ZoneStatus }) {
  if (status === "ISSUE") return <Badge variant="destructive">이슈</Badge>;
  if (status === "BUSY") return <Badge variant="secondary">혼잡</Badge>;
  return <Badge variant="outline">정상</Badge>;
}

export default function ZoneGrid({ zones }: { zones: ZoneItem[] }) {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">구역 상태</div>
        <div className="text-xs text-muted-foreground">총 {zones.length}개 구역</div>
      </div>

      {/* 2 x 2 고정 그리드 */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1">
        {zones.map((z) => (
          <Card
            key={z.id}
            className={z.status === "ISSUE" ? "border-destructive/40" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{z.name}</CardTitle>
                <StatusBadge status={z.status} />
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-md bg-muted/40 p-2 text-center">
                  <div className="text-xs text-muted-foreground">작업중</div>
                  <div className="font-semibold">{z.working}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2 text-center">
                  <div className="text-xs text-muted-foreground">대기</div>
                  <div className="font-semibold">{z.waiting}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2 text-center">
                  <div className="text-xs text-muted-foreground">완료</div>
                  <div className="font-semibold">{z.done}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}