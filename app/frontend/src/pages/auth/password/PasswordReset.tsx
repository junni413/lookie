import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { confirmPasswordReset } from "../../../api/auth";
import { isValidPassword, PASSWORD_HELP } from "../../../utils/validators";

export default function PasswordReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as any)?.resetToken as string | undefined;

  // ✅ 토큰 없으면 렌더 자체를 막아서 런타임 크래시 방지
  useEffect(() => {
    if (!resetToken) {
      alert("잘못된 접근입니다. 다시 인증해주세요.");
      navigate("/auth/password/forgot", { replace: true });
    }
  }, [resetToken, navigate]);

  if (!resetToken) return null;

  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!isValidPassword(pw)) {
      setError(PASSWORD_HELP);
      return;
    }
    if (pw !== pwConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await confirmPasswordReset(resetToken, pw, pwConfirm);
      alert("비밀번호가 변경되었습니다.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white px-4 flex items-center justify-center">
      <div className="w-full max-w-[420px] space-y-6">
        <h1 className="text-xl font-bold text-center">새 비밀번호 설정</h1>

        <div className="space-y-2">
          <div className="text-xs text-gray-400">{PASSWORD_HELP}</div>

          <input
            type="password"
            placeholder="새 비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full h-14 rounded-2xl bg-gray-100 px-5 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            className="w-full h-14 rounded-2xl bg-gray-100 px-5 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        <button
          onClick={handleReset}
          disabled={loading || !pw || !pwConfirm}
          className="w-full h-14 rounded-full bg-blue-600 text-white font-semibold disabled:bg-gray-300"
        >
          {loading ? "변경 중..." : "비밀번호 변경 완료"}
        </button>
      </div>
    </div>
  );
}
