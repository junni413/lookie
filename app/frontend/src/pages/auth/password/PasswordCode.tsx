import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyPasswordResetOtp } from "../../../api/auth";

export default function PasswordCode() {
  const navigate = useNavigate();
  const location = useLocation();

  const rawEmail = location.state?.email as string | undefined;
  const email = useMemo(() => (rawEmail ? rawEmail.trim().toLowerCase() : ""), [rawEmail]);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) navigate("/auth/password/forgot", { replace: true });
  }, [email, navigate]);

  const handleVerify = async () => {
    const sanitizedCode = code.replace(/\D/g, "").slice(0, 6);
    if (!email || sanitizedCode.length !== 6) return;

    try {
      setLoading(true);
      setError("");

      const res = await verifyPasswordResetOtp(email, sanitizedCode);

      // ✅ 여기! resetToken은 res.data.resetToken에 있음
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

  return (
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      <div className="w-full max-w-[420px] space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">인증번호 입력</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-semibold text-blue-600">{email}</span>로 전송된<br />
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
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || code.replace(/\D/g, "").length < 6}
          className="w-full h-14 rounded-full bg-blue-600 text-white font-bold text-lg disabled:bg-gray-200"
        >
          {loading ? "인증 확인 중..." : "인증 완료"}
        </button>
      </div>
    </div>
  );
}
