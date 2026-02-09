import { useEffect, useState, useMemo } from "react";
import { useInterval } from "@/hooks/useInterval";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import StatusCard from "./components/dashboard/StatusCard";
import ZoneGrid from "./components/dashboard/ZoneGrid";
import IssueList from "./components/issue/IssueList";
import { adminService } from "@/services/adminService";
import { issueService } from "@/services/issueService";
import type { AdminIssueSummary } from "@/types/issue";
import { Users, Package, CheckCircle2, History } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ZoneItem } from "./components/dashboard/ZoneGrid";
import { DEFAULT_ZONES, mergeZoneData } from "@/utils/zoneUtils";

type SortKey = "TIME" | "PRIORITY";

export default function Dashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<AdminIssueSummary[]>([]);
  const [zoneData, setZoneData] = useState<ZoneItem[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("TIME");

  // Summary State
  const [summary, setSummary] = useState({
    working: 0,
    waiting: 0,
    done: 0,
    progress: 0,
  });

  const applyZonesOverride = () => {
    try {
      const raw = localStorage.getItem("zones-override");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.zones || !Array.isArray(parsed.zones)) return false;
      setZoneData(parsed.zones.map((z: any) => ({
        id: z.zoneId,
        name: z.name,
        status: z.status,
        working: z.workerCount,
        workRate: z.workRate
      })));
      return true;
    } catch {
      return false;
    }
  };

  /* 
    Polling for Real-time Updates 
    We use a ref to track if it's the first load to strictly control loading states if needed, 
    but Dashboard currently doesn't have a blocking loading state.
  */
  const fetchData = async () => {
      // Parallel execution with independent error handling
      const [issuesResult, zonesResult, summaryResult] = await Promise.allSettled([
        issueService.getIssues({ status: "OPEN" }),
        adminService.getZones(),
        adminService.getDashboardSummary()
      ]);

      // 1. Issues
      if (issuesResult.status === "fulfilled") {
        setIssues(issuesResult.value.issues);
      } else {
        console.error("Failed to load dashboard issues", issuesResult.reason);
      }

      // 2. Zone Stats
      if (zonesResult.status === "fulfilled") {
          const mergedZones = mergeZoneData(zonesResult.value);
          setZoneData(mergedZones.map(z => ({
              id: z.zoneId,
              name: z.name,
              status: z.status,
              working: z.workerCount,
              workRate: z.workRate
          })));
      } else {
        console.error("Failed to load zone stats, using defaults", zonesResult.reason);
        // Only set defaults if we have absolutely no data? 
        // Or should we keep previous data if polling fails?
        // Retaining previous data is better for "silent" failures.
        if (zoneData.length === 0) {
            setZoneData(DEFAULT_ZONES.map(z => ({
                id: z.zoneId,
                name: z.name,
                status: z.status,
                working: z.workerCount,
                workRate: z.workRate
            })));
        }
      }

      // 3. Summary
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        console.error("Failed to load dashboard summary", summaryResult.reason);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const onZonesRefresh = () => {
      applyZonesOverride();
      fetchData();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "zones-refresh-ts") {
        fetchData();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };
    window.addEventListener("zones-refresh", onZonesRefresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("zones-refresh", onZonesRefresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Poll every 5 seconds
  useInterval(() => {
    fetchData();
  }, 5000);

  const sortedIssues = useMemo(() => {
    const arr = [...issues];
    if (sortKey === "TIME") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // urgency Ascending (1 is High, so 1 comes first)
      arr.sort((a, b) => (a.urgency || 99) - (b.urgency || 99));
    }
    return arr;
  }, [issues, sortKey]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] overflow-hidden relative">
      <AdminPageHeader
        title="통합 대시보드"
        description="전체 구역의 실시간 현황과 판정 요청을 한눈에 확인합니다."
        className="pb-0"
      />

      {/* Top Section */}
      <div className="shrink-0 py-6 px-8">
        <section className="grid grid-cols-4 gap-3">
          <StatusCard
            title="작업중인 작업자"
            value={`${summary.working}명`}
            icon={Users}
            onClick={() => navigate('/admin/manage')}
          />
          <StatusCard
            title="대기중인 전체 이슈"
            value={`${summary.waiting}건`}
            icon={Package}
          />
          <StatusCard
            title="완료된 전체 이슈"
            value={`${summary.done}건`}
            icon={CheckCircle2}
          />
          <StatusCard
            title="작업 진행률"
            value={`${Math.floor(summary.progress)}%`}
            icon={History}
          />
        </section>
      </div>

      {/* Bottom Section */}
      <div className="flex-1 min-h-0 flex gap-6 items-stretch px-8 pb-6">

        {/* Left: Zone Cards (Grid) */}
        <div className="flex-1 flex flex-col min-h-0 relative h-[calc(100%+20px)] -mt-5">
          <div className="absolute inset-0 pt-5">
            <ZoneGrid 
                zones={zoneData} 
                onZoneClick={(id) => navigate(`/admin/map?zoneId=${id}`)}
            />
          </div>
        </div>

        {/* Right: Issue List (Card) */}
        <div className="w-[400px] shrink-0 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden h-full border border-slate-100/50">
          <div className="px-5 pt-4 pb-2 flex justify-between items-center shrink-0">
            <h3 className="text-base font-bold text-slate-900">관리자 확인이 필요한 이슈</h3>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortKey("TIME")}
                className={cn(
                  "text-[11px] font-semibold transition-colors cursor-pointer",
                  sortKey === "TIME"
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                시간순
              </button>

              <div className="h-2.5 w-px bg-slate-200" />

              <button
                onClick={() => setSortKey("PRIORITY")}
                className={cn(
                  "text-[11px] font-semibold transition-colors cursor-pointer",
                  sortKey === "PRIORITY"
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                긴급순
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar space-y-1">
            <IssueList 
                issues={sortedIssues} 
                onSelect={(id) => navigate(`/admin/issue?issueId=${id}`)}
            />
          </div>

          {/* Footer: See All Button */}
          <div className="p-4">
            <button
              className="w-full py-3 rounded-full border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              onClick={() => navigate('/admin/issue')}
            >
              전체 이슈 확인하기
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
      `}</style>
    </div>
  );
}
