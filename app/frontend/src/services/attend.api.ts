import axios from "axios";

const API_BASE = "/api/work-logs";

// 토큰을 포함한 설정을 반환하는 헬퍼 함수
const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
});

export const workLogApi = {
  // 출근 시작
  start: () => axios.post(`${API_BASE}/start`, {}, getAuthConfig()),
  
  // 퇴근 종료
  end: () => axios.post(`${API_BASE}/end`, {}, getAuthConfig()),
  
  // 현재 근무 상태 확인 (새로고침 시 필요)
  current: () => axios.get(`${API_BASE}/current`, getAuthConfig()),
};

// 기존 코드와의 호환성을 위한 export
export const attend = async () => {
  return workLogApi.start();
};