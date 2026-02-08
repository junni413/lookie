import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { workLogApi, type DailyWorkLogStats } from "@/services/attend.api";

type Ctx = { setTitle: (t: string) => void };

type WorkLog = {
  date: string; // YYYY-MM-DD
  hours: number;
  minutes: number;
  totalMinutes?: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function WorkHistory() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 현재 달
  const [currentDate, setCurrentDate] = useState(new Date());

  // 오늘 날짜 문자열
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  // 선택 날짜(기본 오늘)
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayString());

  useEffect(() => setTitle("근무 이력 조회"), [setTitle]);

  // ✅ stats 불러오기
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await workLogApi.dailyStats();
        const data = res.data.data ?? [];

        const mapped: WorkLog[] = (data as DailyWorkLogStats[]).map((r) => ({
          date: r.date,
          hours: r.hours,
          minutes: r.minutes,
          totalMinutes: r.totalMinutes,
        }));

        setLogs(mapped);
      } catch (e: any) {
        if (e.response?.status === 403) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          navigate("/login", { replace: true });
          return;
        }
        alert("근무 통계를 불러오지 못했습니다.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

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

  // ✅ 선택된 날짜의 근무 기록
  const selectedLog = useMemo(
    () => logs.find((log) => log.date === selectedDateStr),
    [logs, selectedDateStr]
  );

  // 날짜 클릭
  const handleDateClick = (dayStr: string) => {
    setSelectedDateStr(dayStr);
  };

  // 캘린더 그리드
  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);

      const isSelected = selectedDateStr === dateStr;
      const hasLog = logs.some((log) => log.date === dateStr);

      const today = new Date();
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      const base =
        "h-10 w-10 flex items-center justify-center rounded-full text-sm transition-colors relative";

      days.push(
        <button
          key={dateStr}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            base,
            isSelected
              ? "bg-[#304FFF] text-white font-semibold z-10"
              : hasLog
              ? "bg-[#ECFDF5] text-gray-900"
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

  // ✅ 하단 카드(일별만)
  const DetailCard = () => {
    const [y, m, d] = selectedDateStr.split("-").map((v) => parseInt(v, 10));

    if (loading) {
      return (
        <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 text-sm text-slate-500">
          불러오는 중...
        </div>
      );
    }

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
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 mx-6">
          {year}년 {month + 1}월
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

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
            <div className="w-4 h-4 rounded bg-[#ECFDF5]" />
            <span>근무일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100" />
            <span>오늘</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#304FFF]" />
            <span>선택됨</span>
          </div>
        </div>
      </div>

      <footer className="py-12 text-center text-xs font-bold tracking-[0.2em] text-slate-200">
        LOOKie
      </footer>
    </div>
  );
}
