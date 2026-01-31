import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

type LoginRole = "WORKER" | "ADMIN";

// ✅ 백 응답 포맷에 맞춘 공통 응답 타입
type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

// ✅ /api/auth/login 의 data 구조 (네가 준 Response 기준)
type LoginData = {
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  birthDate: string | null; // LocalDate -> string
  role: LoginRole;
  isActive: boolean;
  accessToken: string;
  refreshToken: string;
};

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  // ✅ 여기서 에러면 catch로 떨어짐 (400/401/500 등)
  if (!res.ok) {
    const err: any = new Error("API Error");
    err.response = { status: res.status, data };
    throw err;
  }

  return data as T;
}

function getErrMessage(err: any): string | null {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.errorMessage ??
    err?.response?.data?.error_message ??
    null
  );
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function Login() {
  const navigate = useNavigate();

  // ✅ authStore(user 포함 버전)의 login 시그니처:
  // login({ token, user })
  const login = useAuthStore((s) => s.login);

  const [id, setId] = useState(""); // 전화번호(아이디)
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return id.trim().length > 0 && pw.trim().length > 0 && !loading;
  }, [id, pw, loading]);

  const handleRealLogin = async () => {
    if (!id.trim() || !pw.trim()) {
      alert("아이디/비밀번호를 입력해주세요");
      return;
    }
    if (loading) return;

    try {
      setLoading(true);

      const phoneNumber = onlyDigits(id);

      const res = await postJSON<ApiResponse<LoginData>>("/api/auth/login", {
        phoneNumber,
        password: pw,
      });

      // ✅ HTTP 200이어도 success=false면 여기서 막기
      if (!res.success) {
        alert(res.message ?? "로그인에 실패했습니다.");
        return;
      }

      const data = res.data;

      // ✅ store에 token + user 저장 (MyPage/내정보수정에서 재사용)
      login({
        token: data.accessToken,
        user: {
          userId: data.userId,
          name: data.name,
          phoneNumber: data.phoneNumber,
          email: data.email,
          birthDate: data.birthDate ?? undefined,
          role: data.role,
          isActive: data.isActive,
        },
      });

      // ✅ role 기반 이동
      navigate(data.role === "WORKER" ? "/worker/attend" : "/admin/dashboard", {
        replace: true,
      });
    } catch (err: any) {
      alert(getErrMessage(err) ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DEV 가짜 로그인도 user까지 채워주기
  const handleMockLogin = (role: LoginRole) => {
    login({
      token: "dummy-token",
      user: {
        userId: 0,
        name: role === "WORKER" ? "임시 작업자" : "임시 관리자",
        phoneNumber: "01000000000",
        email: "dev@local.test",
        birthDate: "2000-01-01",
        role,
        isActive: true,
      },
    });

    navigate(role === "WORKER" ? "/worker/attend" : "/admin/dashboard", {
      replace: true,
    });
  };

  return (
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      <div className="w-full max-w-[430px] md:max-w-[560px] text-center pb-10">
        <div className="translate-y-6 md:translate-y-8">
          <h1 className="mb-8 md:mb-12 text-4xl md:text-6xl font-extrabold text-blue-600">
            Lookie
          </h1>

          <div className="mx-auto w-full max-w-[430px] md:max-w-[520px] space-y-4 md:space-y-6">
            <input
              type="text"
              placeholder="아이디(전화번호)"
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

            <div 
              className="text-right text-sm text-blue-600 cursor-pointer"
              onClick={() => navigate("/auth/password/forgot")} // 중괄호 제거 또는 올바르게 닫기
            >
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
              {loading ? "로그인 중..." : "로그인"}
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
                  ※ DEV에서는 API 로그인 / 임시 로그인 둘 다 가능
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
