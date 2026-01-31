import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordResetOtp } from "../../../api/auth";
import { isValidEmail } from "../../../utils/validators";

export default function PasswordForgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizeEmail = (v: string) => v.trim().toLowerCase();

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
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      <div className="w-full max-w-[420px] space-y-6 relative">
        
        {/* ✅ 뒤로가기 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 top-0 p-2 text-gray-600 hover:text-gray-900"
        >
          ←
        </button>

        <h1 className="text-xl font-bold text-center">비밀번호 찾기</h1>

        <div className="space-y-2">
          <input
            placeholder="이메일을 입력해주세요"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className={`w-full h-14 rounded-2xl bg-gray-100 px-5 outline-none focus:ring-2 ${
              error ? "ring-2 ring-red-400" : "focus:ring-blue-500"
            }`}
            autoComplete="email"
          />
          {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !email.trim()}
          className="w-full h-14 rounded-full bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:bg-gray-200"
        >
          {loading ? "전송 중..." : "인증번호 전송"}
        </button>
      </div>
    </div>
  );
}
