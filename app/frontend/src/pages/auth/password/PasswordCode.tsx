import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      <div className="w-full max-w-[420px] space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">인증번호 입력</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-semibold text-blue-600">{email}</span>로 전송된
            <br />
            인증번호 6자리를 입력해주세요.
          </p>
        </div>

        <div className="space-y-4">
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
            className="w-full h-16 rounded-2xl bg-gray-50 px-4 text-center text-3xl tracking-[0.3em] font-extrabold outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all"
          />

          {/* ✅ 재전송 라인 */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-400">받지 못하셨나요?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className={[
                "font-semibold transition",
                canResend ? "text-blue-600 hover:text-blue-700" : "text-gray-300",
              ].join(" ")}
            >
              {resendLoading ? "재전송 중..." : "재전송하기"}
            </button>

            {/* 타이머 표시 */}
            {cooldown > 0 && (
              <span className="text-gray-300">
                ({mm}:{ss})
              </span>
            )}
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <button
          onClick={handleVerify}
          disabled={!canVerify}
          className="w-full h-14 rounded-full bg-blue-600 text-white font-bold text-lg disabled:bg-gray-200"
        >
          {loading ? "인증 확인 중..." : "인증 완료"}
        </button>
      </div>
    </div>
  );
}
