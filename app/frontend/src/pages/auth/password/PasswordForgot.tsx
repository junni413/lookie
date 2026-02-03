import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordResetOtp } from "../../../api/auth";
import { isValidEmail } from "../../../utils/validators";

export default function PasswordForgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizeEmail = (v: string) => v.trim().toLowerCase();

  const canSend = useMemo(() => {
    const normalized = normalizeEmail(email);
    return normalized.length > 0 && isValidEmail(normalized) && !loading;
  }, [email, loading]);

  const handleSend = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError("이메일 형식을 확인해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await requestPasswordResetOtp(normalizedEmail);
      navigate("/auth/password/code", { state: { email: normalizedEmail } });
    } catch (err: any) {
      const code = err?.response?.data?.errorCode || err?.response?.data?.code;
      if (code === "USER_003") {
        setError("가입되지 않은 이메일입니다.");
      } else {
        setError(err?.response?.data?.message || "인증번호 발송에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white">
      {/* 상단 여백 + 헤더 */}
      <div className="relative px-5 pt-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-7 rounded-full p-2 text-gray-700 hover:bg-gray-100 active:scale-[0.98]"
          aria-label="뒤로가기"
        >
          ←
        </button>

        <h1 className="text-center text-xl font-extrabold text-gray-900">
          비밀번호 찾기
        </h1>
      </div>

      {/* 콘텐츠: 아래쪽 카드처럼 */}
      <div className="px-5">
        <div className="mt-24 mx-auto w-full max-w-[430px]">
          <div className="rounded-[28px] bg-white">
            {/* 입력 */}
            <div className="space-y-2">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="이메일을 입력해주세요"
                autoComplete="email"
                inputMode="email"
                className={[
                  "w-full h-14 rounded-2xl px-5 outline-none",
                  "bg-gray-100/80 border border-transparent",
                  "focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-100",
                  error ? "ring-2 ring-red-100 border-red-200 bg-white" : "",
                ].join(" ")}
              />
              {error && (
                <p className="ml-1 text-xs font-semibold text-red-500">
                  {error}
                </p>
              )}
            </div>

            {/* 버튼 */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={[
                "mt-5 w-full h-14 rounded-full font-extrabold transition",
                "shadow-[0_16px_30px_rgba(37,99,235,0.18)]",
                canSend
                  ? "bg-blue-600 text-white active:scale-[0.99]"
                  : "bg-gray-200 text-white/80 shadow-none",
              ].join(" ")}
            >
              {loading ? "전송 중..." : "인증번호 전송"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
