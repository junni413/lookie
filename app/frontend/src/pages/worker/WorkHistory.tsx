import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

type Ctx = { setTitle: (t: string) => void };

// Mock Data Type
type WorkLog = {
  date: string; // YYYY-MM-DD
  hours: number;
  minutes: number;
};

// Mock Data
const MOCK_LOGS: WorkLog[] = [
  { date: "2022-02-13", hours: 8, minutes: 0 },
  { date: "2022-02-14", hours: 8, minutes: 30 },
  { date: "2022-02-19", hours: 9, minutes: 0 },
  { date: "2022-02-20", hours: 8, minutes: 15 },
  { date: "2022-02-21", hours: 7, minutes: 50 },
  { date: "2022-02-26", hours: 8, minutes: 0 },
  { date: "2022-02-27", hours: 7, minutes: 43 },
  // 2026 Mock Data
  { date: "2026-01-15", hours: 8, minutes: 0 },
  { date: "2026-01-16", hours: 8, minutes: 30 },
  { date: "2026-01-20", hours: 9, minutes: 0 },
  { date: "2026-01-30", hours: 6, minutes: 30 },
];

type ViewMode = "DAY" | "MONTH" | "RANGE";

function toMinutes(log: WorkLog) {
  return log.hours * 60 + log.minutes;
}
function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return { h, m };
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function parseYmd(ymd: string) {
  // ymd: YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  return { y, m, d };
}
function toKeyDate(ymd: string) {
  // 비교용 숫자
  const { y, m, d } = parseYmd(ymd);
  return y * 10000 + m * 100 + d;
}

export default function WorkHistory() {
  const { setTitle } = useOutletContext<Ctx>();

  // State: 현재 보여지는 달 (기본: 현재 날짜)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to get today's string format
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  // State: 선택된 날짜 (기본: 오늘)
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayString());

  // ✅ 추가: 모드 (일별/월별/기간별)
  const [mode, setMode] = useState<ViewMode>("DAY");

  // ✅ 추가: 기간 선택 (기간별 모드에서 사용)
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  useEffect(() => setTitle("근무 이력 조회"), [setTitle]);

  // 달력 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0~11

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  };

  // ✅ 선택된 날짜의 근무 기록 찾기 (일별)
  const selectedLog = useMemo(
    () => MOCK_LOGS.find((log) => log.date === selectedDateStr),
    [selectedDateStr]
  );

  // ✅ 월별 필터
  const monthLogs = useMemo(() => {
    const ym = `${year}-${pad2(month + 1)}`; // YYYY-MM
    return MOCK_LOGS.filter((log) => log.date.startsWith(ym));
  }, [year, month]);

  const monthTotal = useMemo(() => {
    const totalMin = monthLogs.reduce((acc, log) => acc + toMinutes(log), 0);
    return { ...fromMinutes(totalMin), days: monthLogs.length };
  }, [monthLogs]);

  // ✅ 기간별 필터/합산
  const rangeTotal = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;

    const s = toKeyDate(rangeStart);
    const e = toKeyDate(rangeEnd);

    const [minKey, maxKey] = s <= e ? [s, e] : [e, s];

    const logs = MOCK_LOGS.filter((log) => {
      const k = toKeyDate(log.date);
      return k >= minKey && k <= maxKey;
    });

    const totalMin = logs.reduce((acc, log) => acc + toMinutes(log), 0);
    return { ...fromMinutes(totalMin), days: logs.length };
  }, [rangeStart, rangeEnd]);

  // ✅ 날짜 클릭 핸들러
  const handleDateClick = (dayStr: string) => {
    if (mode === "RANGE") {
      // 기간별: 시작/종료 찍기
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(dayStr);
        setRangeEnd(null);
        return;
      }
      // start만 있는 상태면 end 설정
      const sKey = toKeyDate(rangeStart);
      const dKey = toKeyDate(dayStr);
      if (dKey < sKey) {
        // 역순 선택이면 스왑해서 보기 좋게
        setRangeEnd(rangeStart);
        setRangeStart(dayStr);
      } else {
        setRangeEnd(dayStr);
      }
      return;
    }

    // 일별/월별일 때는 단일 선택
    setSelectedDateStr(dayStr);
  };

  // ✅ 범위 하이라이트 체크
  const isInRange = (dateStr: string) => {
    if (mode !== "RANGE") return false;
    if (!rangeStart && !rangeEnd) return false;

    if (rangeStart && !rangeEnd) {
      return dateStr === rangeStart;
    }

    if (rangeStart && rangeEnd) {
      const s = toKeyDate(rangeStart);
      const e = toKeyDate(rangeEnd);
      const [minKey, maxKey] = s <= e ? [s, e] : [e, s];
      const k = toKeyDate(dateStr);
      return k >= minKey && k <= maxKey;
    }

    return false;
  };

  const isRangeEdge = (dateStr: string) => {
    if (mode !== "RANGE") return false;
    if (!rangeStart) return false;
    if (!rangeEnd) return dateStr === rangeStart;

    const s = toKeyDate(rangeStart);
    const e = toKeyDate(rangeEnd);
    const start = s <= e ? rangeStart : rangeEnd;
    const end = s <= e ? rangeEnd : rangeStart;
    return dateStr === start || dateStr === end;
  };

  // 캘린더 그리드 생성
  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);

      const isSelected = selectedDateStr === dateStr;
      const hasLog = MOCK_LOGS.some((log) => log.date === dateStr);

      const today = new Date();
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      const inRange = isInRange(dateStr);
      const edge = isRangeEdge(dateStr);

      const base =
        "h-10 w-10 flex items-center justify-center rounded-full text-sm transition-colors relative";

      // ✅ 기간 모드: 범위는 연하게 칠하고, 시작/끝은 진하게
      if (mode === "RANGE") {
        days.push(
          <button
            key={dateStr}
            onClick={() => handleDateClick(dateStr)}
            className={cn(
              base,
              edge
                ? "bg-blue-600 text-white font-semibold z-10"
                : inRange
                ? "bg-blue-50 text-gray-900"
                : hasLog
                ? "bg-green-100/80 text-gray-900"
                : isToday
                ? "bg-gray-100 text-gray-900"
                : "text-gray-900 hover:bg-gray-50"
            )}
          >
            {d}
          </button>
        );
        continue;
      }

      // ✅ 일/월 모드 기존 로직
      days.push(
        <button
          key={dateStr}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            base,
            isSelected
              ? "bg-blue-600 text-white font-semibold z-10"
              : hasLog
              ? "bg-green-100/80 text-gray-900"
              : isToday
              ? "bg-gray-100 text-gray-900"
              : "text-gray-900 hover:bg-gray-50"
          )}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  // UI: 상단 모드 탭
  const ModeTabs = () => (
    <div className="px-6 pt-2">
      <div className="grid grid-cols-3 rounded-2xl bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("DAY")}
          className={cn(
            "h-10 rounded-xl text-sm font-extrabold transition",
            mode === "DAY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          )}
        >
          일별
        </button>
        <button
          type="button"
          onClick={() => setMode("MONTH")}
          className={cn(
            "h-10 rounded-xl text-sm font-extrabold transition",
            mode === "MONTH"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          )}
        >
          월별
        </button>
        <button
          type="button"
          onClick={() => setMode("RANGE")}
          className={cn(
            "h-10 rounded-xl text-sm font-extrabold transition",
            mode === "RANGE"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          )}
        >
          기간별
        </button>
      </div>

      {mode === "RANGE" && (
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
          <div>
            시작:{" "}
            <span className="text-slate-900 font-extrabold">
              {rangeStart ?? "—"}
            </span>
          </div>
          <div>
            종료:{" "}
            <span className="text-slate-900 font-extrabold">
              {rangeEnd ?? "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setRangeStart(null);
              setRangeEnd(null);
            }}
            className="rounded-full bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-600"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );

  // 하단 카드: 모드별로 내용 바꾸기
  const DetailCard = () => {
    if (mode === "MONTH") {
      return (
        <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-sm text-gray-500 mb-1">
              {year}년 {month + 1}월 총 근무시간
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {monthLogs.length > 0 ? (
                <>
                  {monthTotal.h}시간 <span className="ml-1">{monthTotal.m}분</span>
                </>
              ) : (
                <span className="text-gray-300 text-2xl font-normal">기록 없음</span>
              )}
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-500">
              근무일 수:{" "}
              <span className="text-slate-900 font-extrabold">{monthTotal.days}일</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
        </div>
      );
    }

    if (mode === "RANGE") {
      return (
        <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-sm text-gray-500 mb-1">
              기간별 총 근무시간
            </div>

            {!rangeStart || !rangeEnd ? (
              <div className="text-gray-300 text-base font-semibold">
                달력에서 시작일과 종료일을 선택해주세요.
              </div>
            ) : rangeTotal && rangeTotal.days > 0 ? (
              <>
                <div className="text-3xl font-bold text-gray-900">
                  {rangeTotal.h}시간 <span className="ml-1">{rangeTotal.m}분</span>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">
                  근무일 수:{" "}
                  <span className="text-slate-900 font-extrabold">{rangeTotal.days}일</span>
                </div>
              </>
            ) : (
              <div className="text-gray-300 text-base font-semibold">
                선택한 기간에 기록이 없어요.
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
        </div>
      );
    }

    // DAY
    const [y, m, d] = selectedDateStr.split("-").map((v) => parseInt(v, 10));
    return (
      <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-sm text-gray-500 mb-1">
            {y}년 {m}월 {d}일 근무시간
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {selectedLog ? (
              <>
                {selectedLog.hours}시간 <span className="ml-1">{selectedLog.minutes}분</span>
              </>
            ) : (
              <span className="text-gray-300 text-2xl font-normal">기록 없음</span>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Month Navigation */}
      <div className="flex items-center justify-center py-4 bg-white">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 mx-6">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* ✅ Mode Tabs */}
      <ModeTabs />

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 text-center mb-2 mt-3">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day} className="text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-4 justify-items-center px-4">
        {renderCalendarDays()}
      </div>

      {/* Detail Card Area */}
      <div className="mt-8 px-6 flex-1 flex flex-col items-center">
        <DetailCard />

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-gray-500 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100/80" />
            <span>근무일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100" />
            <span>오늘</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600" />
            <span>{mode === "RANGE" ? "기간(시작/끝)" : "선택됨"}</span>
          </div>
          {mode === "RANGE" && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-50" />
              <span>기간 내</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
