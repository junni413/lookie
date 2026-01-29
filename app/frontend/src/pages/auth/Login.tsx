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
      // TODO: API 연동
    } catch {
      alert("로그인에 실패했습니다.");
    }
  };

  const handleMockLogin = (role: "WORKER" | "ADMIN") => {
    login({ token: "dummy-token", role });
    navigate(role === "WORKER" ? "/worker/attend" : "/admin/dashboard", {
      replace: true,
    });
  };

  return (
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      {/* ✅ 모바일: 430 / 데스크탑: 560 */}
      <div className="w-full max-w-[430px] md:max-w-[560px] text-center pb-10">
        {/* ✅ 전체를 살짝 아래로 */}
        <div className="translate-y-6 md:translate-y-8">
          <h1 className="mb-8 md:mb-12 text-4xl md:text-6xl font-extrabold text-blue-600">
            Lookie
          </h1>

          <div className="mx-auto w-full max-w-[430px] md:max-w-[520px] space-y-4 md:space-y-6">
            <input
              type="text"
              placeholder="아이디"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-3xl bg-slate-100 px-6 md:px-8 py-4 md:py-7 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-3xl bg-slate-100 px-6 md:px-8 py-4 md:py-7 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="text-right text-sm text-blue-600 cursor-pointer">
              비밀번호 찾기
            </div>

            <button
              type="button"
              onClick={handleRealLogin}
              disabled={!canSubmit}
              className={`mt-2 w-full rounded-full py-5 md:py-8 text-lg font-semibold transition shadow-xl ${
                canSubmit
                  ? "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700"
                  : "bg-blue-200/60 text-white/90 shadow-transparent"
              }`}
            >
              로그인
            </button>

            <div
              className="pt-3 md:pt-4 text-sm md:text-base text-gray-300 cursor-pointer"
              onClick={() => navigate("/signup")}
            >
              회원가입
            </div>

            {import.meta.env.DEV && (
              <div className="mt-10 md:mt-14 flex flex-col items-center gap-4">
                <div className="text-xs tracking-widest text-gray-300">
                  DEV ONLY
                </div>

                <div className="flex w-full gap-4">
                  <button
                    type="button"
                    onClick={() => handleMockLogin("WORKER")}
                    className="w-full rounded-2xl bg-gray-900 py-3 md:py-4 text-sm md:text-base font-semibold text-white hover:bg-black"
                  >
                    임시 로그인 (WORKER)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMockLogin("ADMIN")}
                    className="w-full rounded-2xl bg-gray-900 py-3 md:py-4 text-sm md:text-base font-semibold text-white hover:bg-black"
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
    </div>
  );
}
