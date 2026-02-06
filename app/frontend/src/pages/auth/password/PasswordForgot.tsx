import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
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
    <div className="min-h-dvh bg-white flex flex-col">
      {/* 고정 헤더 */}
      <header className="flex h-14 items-center justify-between px-4 mt-2">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="홈으로"
        >
          <Home className="h-5 w-5" />
        </button>
      </header>

      {/* 콘텐츠영역: 수직 중앙에 가깝게 배치하되 헤더 여백 고려 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* 제목 섹션 */}
          <div className="space-y-3">
            <h1 className="text-[26px] font-black tracking-tight text-slate-900">
              비밀번호를 잊으셨나요?
            </h1>
            <p className="text-[14px] font-medium leading-relaxed text-slate-400">
              비밀번호 재설정을 위해선<br />
              가입하신 이메일을 입력해주세요.
            </p>
          </div>

          {/* 입력 필드 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[15px] font-black text-slate-900">
                이메일 입력:
              </label>
              <div className="relative">
                <input
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="이메일을 입력해 주세요."
                  autoComplete="email"
                  inputMode="email"
                  className={`
                    w-full h-14 rounded-2xl px-5 text-[15px] font-bold outline-none border transition-all
                    ${error 
                      ? "border-red-500 bg-red-50 focus:bg-white" 
                      : "border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"
                    }
                  `}
                />
              </div>
              {error && (
                <p className="ml-1 text-[13px] font-bold text-red-500">
                  {error}
                </p>
              )}
            </div>

            {/* 버튼 */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`
                w-full h-14 rounded-full text-[16px] font-black transition-all active:scale-[0.98] mt-2
                ${canSend
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-200 text-white/80"
                }
              `}
            >
              {loading ? "전송 중..." : "인증번호 전송"}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
