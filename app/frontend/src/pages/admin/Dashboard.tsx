import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusCard from "./components/StatusCard";
import ZoneGrid from "./components/ZoneGrid";
import IssueList from "./components/IssueList";
import { adminDashboardMock, adminIssueMock } from "@/mocks/mockData";

export default function Dashboard() {
  const { summary, zones } = adminDashboardMock;

  return (
    <div className="space-y-6">
      {/* Layout grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Top: summary */}
        <section className="col-span-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">작업 현황 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard title="작업 중인 작업자" value={summary.working} variant="primary" />
                <StatusCard title="대기 중인 판정" value={summary.waiting} />
                <StatusCard title="완료된 판정" value={summary.done} />
                <StatusCard
                  title="작업 진행률"
                  value={`${summary.progress}%`}
                  variant="progress"
                  progressValue={summary.progress}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Left: zone */}
        <section className="col-span-12 lg:col-span-7">
          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <ZoneGrid zones={zones} />
            </CardContent>
          </Card>
        </section>

        {/* Right: issue */}
        <section className="col-span-12 lg:col-span-5">
          <Card className="h-full">
            <CardContent className="pt-6">
              <IssueList items={adminIssueMock} />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
