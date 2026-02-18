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
import { useZoneStats } from "@/hooks/useZoneStats";

/**
 * 이슈 정렬 기준
 * - TIME: 생성 시간 기준 (최신순)
 * - PRIORITY: 긴급도 기준 (숫자 낮을수록 우선)
 */
type SortKey = "TIME" | "PRIORITY";

export default function Dashboard() {
  const navigate = useNavigate();

  /** 관리자 확인이 필요한 OPEN 이슈 목록 */
  const [issues, setIssues] = useState<AdminIssueSummary[]>([]);

  /** 구역(Zone) 현황 데이터 */
  const { zones: zoneStats } = useZoneStats({ pollingMs: 5000, autoRefresh: true });

  /** 이슈 정렬 기준 상태 */
  const [sortKey, setSortKey] = useState<SortKey>("TIME");

  /**
   * 대시보드 상단 요약 데이터
   * - working : 작업 중인 작업자 수
   * - waiting : 대기 중 이슈 수
   * - done    : 완료된 이슈 수
   * - progress: 전체 진행률 (%)
   */
  const [summary, setSummary] = useState({
    working: 0,
    waiting: 0,
    done: 0,
    progress: 0,
  });

  /**
   * 로컬스토리지에 저장된 Zone Override 적용
   * - 주로 개발/운영 중 임시 데이터 주입 용도
   * - 성공 시 true 반환
   */
  /**
   * 대시보드 전체 데이터 로딩
   * - 이슈
   * - 구역 상태
   * - 요약 데이터
   *
   * Promise.allSettled 사용:
   * → 일부 API 실패 시에도 다른 데이터는 정상 렌더링되도록 설계
   */
  const fetchData = async () => {
    const [issuesResult, summaryResult] =
      await Promise.allSettled([
        issueService.getIssues({ status: "OPEN" }),
        adminService.getDashboardSummary(),
      ]);

    /** 1. 이슈 데이터 */
    if (issuesResult.status === "fulfilled") {
      setIssues(issuesResult.value.issues);
    } else {
      console.error("Failed to load dashboard issues", issuesResult.reason);
    }

    /** 2. 구역(Zone) 데이터 */
    if (summaryResult.status === "fulfilled") {
      console.log("[Dashboard] summary", summaryResult.value);
      setSummary(summaryResult.value);
    } else {
      console.error(
        "Failed to load dashboard summary",
        summaryResult.reason
      );
    }
  };

  /** 최초 진입 시 데이터 로딩 */
  useEffect(() => {
    fetchData();
  }, []);

  /**
   * 외부 이벤트 기반 갱신 처리
   * - zones-refresh 커스텀 이벤트
   * - localStorage 변경 (다른 탭)
   * - 탭 비활성 → 활성 전환 시
   */
  useEffect(() => {
    const onZonesRefresh = () => {
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

  /** 5초 주기의 폴링 */
  useInterval(() => {
    fetchData();
  }, 5000);

  /**
   * 이슈 정렬 결과 메모이제이션
   * - TIME: 생성일 기준 최신순
   * - PRIORITY: 긴급도 오름차순 (1이 가장 긴급)
   */
  const sortedIssues = useMemo(() => {
    const arr = [...issues];

    if (sortKey === "TIME") {
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
    } else {
      arr.sort(
        (a, b) => (a.urgency || 99) - (b.urgency || 99)
      );
    }

    return arr;
  }, [issues, sortKey]);

  const zoneData: ZoneItem[] = zoneStats.map((z) => ({
    id: z.zoneId,
    name: z.name,
    status: z.status,
    working: z.workerCount,
    workRate: z.workRate,
    openIssueCount: z.openIssueCount ?? 0,
  }));

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] overflow-hidden relative">
      {/* 상단 헤더 */}
      <AdminPageHeader
        title="통합 대시보드"
        description="전체 구역의 실시간 현황과 판정 요청을 한눈에 확인합니다."
        className="pb-0"
      />

      {/* 요약 카드 영역 */}
      <div className="shrink-0 py-6 px-8">
        <section className="grid grid-cols-4 gap-3">
          <StatusCard
            title="작업중인 작업자"
            value={`${summary.working}명`}
            icon={Users}
            onClick={() => navigate("/admin/manage")}
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

      {/* 하단 메인 콘텐츠 */}
      <div className="flex-1 min-h-0 flex gap-6 items-stretch px-8 pb-6">
        {/* 좌측: Zone 현황 */}
        <div className="flex-1 flex flex-col min-h-0 relative h-[calc(100%+20px)] -mt-5">
          <div className="absolute inset-0 pt-5">
            <ZoneGrid
              zones={zoneData}
              onZoneClick={(id) =>
                navigate(`/admin/map?zoneId=${id}`)
              }
            />
          </div>
        </div>

        {/* 우측: 이슈 리스트 */}
        <div className="w-[400px] shrink-0 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden h-full border border-slate-100/50">
          {/* 헤더 + 정렬 */}
          <div className="px-5 pt-4 pb-2 flex justify-between items-center shrink-0">
            <h3 className="text-base font-bold text-slate-900">
              관리자 확인이 필요한 이슈
            </h3>

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

          {/* 이슈 리스트 */}
          <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar space-y-1">
            <IssueList
              issues={sortedIssues}
              onSelect={(id) =>
                navigate(`/admin/issue?issueId=${id}`)
              }
            />
          </div>

          {/* 전체 이슈 보기 */}
          <div className="p-4">
            <button
              className="w-full py-3 rounded-full border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              onClick={() => navigate("/admin/issue")}
            >
              전체 이슈 확인하기
            </button>
          </div>
        </div>
      </div>

      {/* 스크롤바 숨김 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
      `}</style>
    </div>
  );
}
