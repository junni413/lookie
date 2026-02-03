import axios from "axios";

const API_BASE = "/api/work-logs";

const getAccessToken = () => localStorage.getItem("accessToken");

const getAuthConfig = () => {
  const token = getAccessToken();
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
};

// ✅ 공통 응답 타입
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

// ✅ WorkLog 타입(스웨거 기준)
export type WorkLogStatus = "START" | "PAUSE" | "RESUME" | "END";

export type WorkLogData = {
  workLogId: number;
  workerId: number;
  workerName: string;
  zoneId: number | null;
  currentStatus: WorkLogStatus;
  startedAt: string; // ISO string
  endedAt?: string | null;
  plannedEndAt?: string | null;
  lastStatusChangedAt?: string | null;
  lineId?: number | null;
  locationCode?: string | null;
  workCount?: number;
  workRate?: number;
};

// ✅ 캘린더용 통계 타입
export type DailyWorkLogStats = {
  date: string; // "YYYY-MM-DD"
  hours: number;
  minutes: number;
  totalMinutes: number;
};

export const workLogApi = {
  // 출근 시작
  start: () => axios.post<ApiResponse<WorkLogData>>(`${API_BASE}/start`, {}, getAuthConfig()),

  // 퇴근 종료
  end: () => axios.post<ApiResponse<WorkLogData>>(`${API_BASE}/end`, {}, getAuthConfig()),

  // 중단/휴식
  pause: (reason?: string) =>
    axios.post<ApiResponse<WorkLogData>>(
      `${API_BASE}/pause`,
      reason ? { reason } : {},
      getAuthConfig()
    ),

  // 재개
  resume: () => axios.post<ApiResponse<WorkLogData>>(`${API_BASE}/resume`, {}, getAuthConfig()),

  // 현재 근무 상태
  current: () => axios.get<ApiResponse<WorkLogData>>(`${API_BASE}/current`, getAuthConfig()),

  // ✅ 내 근무 이력 전체(리스트)
  histories: () => axios.get<ApiResponse<WorkLogData[]>>(`${API_BASE}`, getAuthConfig()),

  // ✅ 내 근무 이력 통계(캘린더용)
  dailyStats: () => axios.get<ApiResponse<DailyWorkLogStats[]>>(`${API_BASE}/stats`, getAuthConfig()),
};

// 기존 코드 호환
export const attend = async () => workLogApi.start();
