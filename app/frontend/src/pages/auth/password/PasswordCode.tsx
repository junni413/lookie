import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Home } from "lucide-react";
import { verifyPasswordResetOtp, requestPasswordResetOtp } from "../../../api/auth";

const RESEND_COOLDOWN_SEC = 60;

export default function PasswordCode() {
  const navigate = useNavigate();
  const location = useLocation();

  const rawEmail = location.state?.email as string | undefined;
  const email = useMemo(
    () => (rawEmail ? rawEmail.trim().toLowerCase() : ""),
    [rawEmail]
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 재전송
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (!email) navigate("/auth/password/forgot", { replace: true });
  }, [email, navigate]);

  // ✅ 타이머 카운트다운
  useEffect(() => {
    if (!email) return;
    if (cooldown <= 0) return;

    const t = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [cooldown, email]);

  const canVerify = useMemo(() => {
    const sanitized = code.replace(/\D/g, "");
    return sanitized.length === 6 && !loading;
  }, [code, loading]);

  const canResend = useMemo(() => {
    return !resendLoading && cooldown === 0;
  }, [resendLoading, cooldown]);

  const handleVerify = async () => {
    const sanitizedCode = code.replace(/\D/g, "").slice(0, 6);
    if (!email || sanitizedCode.length !== 6) return;

    try {
      setLoading(true);
      setError("");

      const res = await verifyPasswordResetOtp(email, sanitizedCode);
      const token = res?.data?.resetToken;

      if (token) {
        navigate("/auth/password/reset", {
          state: { resetToken: token },
          replace: true,
        });
      } else {
        setError("인증 토큰을 응답받지 못했습니다.");
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      setError(serverMessage || "인증번호가 일치하지 않거나 만료되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    if (!canResend) return;

    try {
      setResendLoading(true);
      setError("");

      await requestPasswordResetOtp(email);

      // ✅ 재전송 성공 → 타이머 리셋 + 입력 초기화(선택)
      setCode("");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "인증번호 재전송에 실패했습니다.";
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const mm = String(Math.floor(cooldown / 60)).padStart(2, "0");
  const ss = String(cooldown % 60).padStart(2, "0");

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* 고정 헤더: PasswordForgot와 일관성 유지 */}
      <header className="flex h-14 items-center justify-between px-4 mt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="뒤로가기"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="홈으로"
        >
          <Home className="h-5 w-5" />
        </button>
      </header>

      {/* 콘텐츠영역: PasswordForgot와 동일한 박스 크기 및 타이틀 구성 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* 제목 섹션 */}
          <div className="space-y-3">
            <h1 className="text-[26px] font-black tracking-tight text-slate-900 leading-tight">
              인증번호 입력
            </h1>
            <p className="text-[14px] font-medium leading-relaxed text-slate-400">
              <span className="font-bold text-blue-600 break-all">{email}</span>로 전송된<br />
              인증번호 6자리를 입력해주세요.
            </p>
          </div>

          <div className="space-y-5">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="인증번호 6자리"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                className={`
                  w-full h-16 rounded-2xl bg-slate-50 px-4 text-center text-3xl tracking-[0.3em] font-black outline-none border transition-all
                  ${error
                    ? "border-red-500 bg-red-50"
                    : "border-slate-100 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"
                  }
                `}
              />
            </div>

            {/* 재전송 및 에러 메시지 */}
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-[14px]">
                <span className="text-slate-400 font-medium">받지 못하셨나요?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`
                    font-bold transition-colors
                    ${canResend ? "text-blue-600 hover:text-blue-700 underline underline-offset-4" : "text-slate-300"}
                  `}
                >
                  {resendLoading ? "재전송 중..." : "재전송하기"}
                </button>
                {cooldown > 0 && (
                  <span className="text-slate-400 font-mono">
                    ({mm}:{ss})
                  </span>
                )}
              </div>

              {error && (
                <p className="text-[13px] font-bold text-red-500">
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={!canVerify}
              className={`
                w-full h-14 rounded-full text-[16px] font-black transition-all active:scale-[0.98]
                ${canVerify
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-200 text-white/80"
                }
              `}
            >
              {loading ? "인증 확인 중..." : "인증 완료"}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
