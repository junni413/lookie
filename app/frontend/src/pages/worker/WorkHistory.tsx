import { useEffect, useState } from "react";
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

export default function WorkHistory() {
  const { setTitle } = useOutletContext<Ctx>();

  // State: 현재 보여지는 달 (기본: 현재 날짜)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to get today's string format
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // State: 선택된 날짜 (기본: 오늘)
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayString());

  useEffect(() => setTitle("근무 이력 조회"), [setTitle]);

  // 달력 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0~11

  // 이번 달의 1일
  const firstDay = new Date(year, month, 1);
  // 이번 달의 마지막 날
  const lastDay = new Date(year, month + 1, 0);

  // 1일의 요일 (0: 일, 1: 월 ... 6: 토)
  const startDayOfWeek = firstDay.getDay();
  // 이번 달 총 일수
  const daysInMonth = lastDay.getDate();

  // 이전 달 이동
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  // 다음 달 이동
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (dayStr: string) => {
    setSelectedDateStr(dayStr);
  };

  // Helper: 날짜 포맷 (YYYY-MM-DD)
  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  // 선택된 날짜의 근무 기록 찾기
  const selectedLog = MOCK_LOGS.find((log) => log.date === selectedDateStr);

  // 캘린더 그리드 생성
  const renderCalendarDays = () => {
    const days = [];

    // 빈 칸 (1일 이전)
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    // 날짜
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const isSelected = selectedDateStr === dateStr;

      // Mock Data 체크
      const hasLog = MOCK_LOGS.some(log => log.date === dateStr);

      // 오늘 날짜 체크 (실제 오늘)
      const today = new Date();
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      days.push(
        <button
          key={dateStr}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full text-sm transition-colors relative",
            isSelected
              ? "bg-blue-600 text-white font-semibold z-10" // 선택됨
              : hasLog
                ? "bg-green-100/80 text-gray-900" // 근무일 (약하게)
                : isToday
                  ? "bg-gray-100 text-gray-900" // 오늘
                  : "text-gray-900 hover:bg-gray-50"
          )}
        >
          {d}
        </button>
      );
    }
    return days;
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
      <div className="grid grid-cols-7 text-center mb-2">
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

      {/* Legend & Detail Card Area */}
      <div className="mt-8 px-6 flex-1 flex flex-col items-center">

        {/* Detail Card */}
        <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden">
          {/* Card Content */}
          <div className="relative z-10">
            <div className="text-sm text-gray-500 mb-1">
              {selectedDateStr.split("-")[0]}년 {parseInt(selectedDateStr.split("-")[1])}월 {parseInt(selectedDateStr.split("-")[2])}일 근무시간
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

          {/* Background Decoration (Optional for polished look) */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
        </div>

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
            <span>선택됨</span>
          </div>
        </div>

      </div>
    </div>
  );
}
