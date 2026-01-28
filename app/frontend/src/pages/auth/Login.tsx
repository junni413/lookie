import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const canSubmit = useMemo(() => {
    return id.trim().length > 0 && pw.trim().length > 0;
  }, [id, pw]);

  /**
   * 실제 로그인 핸들러
   * - 현재는 DEV 환경에서만 차단
   * - API 연결 시 이 함수 내부에 로직 추가 예정
   */
  const handleRealLogin = async () => {
    if (!canSubmit) {
      alert("아이디/비밀번호를 입력해주세요");
      return;
    }

    if (import.meta.env.DEV) {
      alert("현재는 DEV 가짜 로그인(검은 버튼)으로만 진입 가능합니다.");
      return;
    }

    try {
      // API 연동 시 로그인 로직 구현
    } catch {
      alert("로그인에 실패했습니다.");
    }
  };

  /**
   * DEV 전용 가짜 로그인
   */
  const handleMockLogin = (role: "WORKER" | "ADMIN") => {
    login({ token: "dummy-token", role });
    navigate(role === "WORKER" ? "/worker/home" : "/admin/dashboard", {
      replace: true,
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[560px] text-center">
        <h1 className="mb-10 text-5xl font-extrabold text-blue-600">
          Lookie
        </h1>

        <div className="mx-auto w-full max-w-[520px]">
          <input
            type="text"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mb-6 w-full rounded-2xl bg-slate-100 px-6 py-6 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="mb-2 w-full rounded-2xl bg-slate-100 px-6 py-6 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mb-8 text-right text-xs text-blue-600 cursor-pointer">
            비밀번호 찾기
          </div>

          <button
            type="button"
            onClick={handleRealLogin}
            disabled={!canSubmit}
            className="mb-6 w-full rounded-full bg-blue-600 py-6 text-base font-semibold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            로그인
          </button>

          <div className="text-sm text-gray-300 cursor-pointer">
            회원가입
          </div>

          {import.meta.env.DEV && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="text-xs tracking-widest text-gray-300">
                DEV ONLY
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleMockLogin("WORKER")}
                  className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
                >
                  임시 로그인 (WORKER)
                </button>

                <button
                  type="button"
                  onClick={() => handleMockLogin("ADMIN")}
                  className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
                >
                  임시 로그인 (ADMIN)
                </button>
              </div>

              <div className="text-[11px] text-gray-300">
                ※ API 연결 후 DEV ONLY 영역 제거
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
