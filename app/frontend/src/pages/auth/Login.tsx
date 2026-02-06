import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Lock, Phone } from "lucide-react";
import LogoAnimation from "../../components/auth/LogoAnimation";

type LoginRole = "WORKER" | "ADMIN";
// ... (rest of imports and types)

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
};

type LoginData = {
  userId: number;
  name: string;
  phoneNumber: string;
  email: string;
  birthDate: string | null;
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

  // ✅ 응답이 JSON이 아닐 수도 있어서 text -> json 파싱
  const text = await res.text();
  const data = (() => {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  })();

  // ✅ HTTP 에러면 throw (catch에서 alert)
  if (!res.ok) {
    const err: any = new Error("API Error");
    err.response = { status: res.status, data };
    throw err;
  }

  return data as T;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(id.trim()) && Boolean(pw.trim()) && !loading,
    [id, pw, loading]
  );

  const handleLogin = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);

      const res = await postJSON<ApiResponse<LoginData>>("/api/auth/login", {
        phoneNumber: onlyDigits(id),
        password: pw,
      });

      // ✅ 서버가 success=false로 내려주는 케이스
      if (!res?.success) {
        alert(res?.message ?? "로그인에 실패했습니다.");
        return;
      }

      // ✅ 응답 방어
      if (!res?.data?.accessToken) {
        alert("로그인 응답이 올바르지 않습니다.");
        return;
      }

      const d = res.data;

      login({
        token: d.accessToken,
        refreshToken: d.refreshToken,
        user: {
          userId: d.userId,
          name: d.name,
          phoneNumber: d.phoneNumber,
          email: d.email,
          birthDate: d.birthDate ?? undefined,
          role: d.role,
          isActive: d.isActive,
          passwordHash: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      navigate(d.role === "WORKER" ? "/worker/attend" : "/admin/dashboard", {
        replace: true,
      });
    } catch (e: any) {
      // ✅ throw 난 케이스(401/400/500 등) 여기서 alert
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;

      if (status === 401) alert(serverMsg ?? "아이디 또는 비밀번호가 올바르지 않습니다.");
      else if (status === 400) alert(serverMsg ?? "요청 값이 올바르지 않습니다.");
      else if (status === 403) alert(serverMsg ?? "세션이 만료되었습니다. 다시 로그인해주세요.");
      else alert(serverMsg ?? "로그인 중 오류가 발생했습니다.");

      console.error("login error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] text-center">
        {/* Logo */}
        <LogoAnimation />

        {/* ✅ ENTER 제출을 위해 form 사용 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* Login Card */}
          <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm text-left">
            <FieldRow
              icon={<Phone size={20} />}
              placeholder="아이디(전화번호)"
              value={id}
              onChange={setId}
              type="tel"
              autoComplete="username"
              inputMode="numeric"
            />
            <Divider />
            <FieldRow
              icon={<Lock size={20} />}
              placeholder="비밀번호"
              value={pw}
              onChange={setPw}
              type="password"
              autoComplete="current-password"
            />
          </div>

          {/* Forgot password */}
          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() => navigate("/auth/password/forgot")}
              className="text-sm font-bold text-blue-600"
            >
              비밀번호 찾기
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-8 flex h-14 w-full items-center justify-center rounded-[18px]
              bg-blue-600 text-[16px] font-black text-white
              disabled:bg-blue-200 transition active:scale-[0.99]"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Signup */}
        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="mt-6 text-sm font-bold text-slate-500"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100" />;
}

function FieldRow({
  icon,
  placeholder,
  value,
  onChange,
  type,
  autoComplete,
  inputMode,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="text-slate-400">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="w-full bg-transparent text-[15px] font-bold
          text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
