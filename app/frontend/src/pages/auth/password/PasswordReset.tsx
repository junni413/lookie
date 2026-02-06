import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Home } from "lucide-react";
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
    <div className="min-h-dvh bg-white flex flex-col">
      {/* 고정 헤더: 이전 단계들과 일관성 유지 */}
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

      {/* 콘텐츠영역 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* 제목 섹션 */}
          <div className="space-y-3">
            <h1 className="text-[26px] font-black tracking-tight text-slate-900">
              새 비밀번호 설정
            </h1>
            <p className="text-[14px] font-medium leading-relaxed text-slate-400">
              안전한 사용을 위해<br />
              새로운 비밀번호를 입력해주세요.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-[12px] font-bold text-slate-400 mb-1">
                {PASSWORD_HELP}
              </div>

              <input
                type="password"
                placeholder="새 비밀번호"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 px-5 text-[15px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 px-5 text-[15px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <p className="text-[13px] font-bold text-red-500 text-center">
                {error}
              </p>
            )}

            <button
              onClick={handleReset}
              disabled={loading || !pw || !pwConfirm}
              className={`
                w-full h-14 rounded-full text-[16px] font-black transition-all active:scale-[0.98] mt-2
                ${!loading && pw && pwConfirm
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-200 text-white/80"
                }
              `}
            >
              {loading ? "변경 중..." : "비밀번호 변경 완료"}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
