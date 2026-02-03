import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Lock, Phone } from "lucide-react";

type LoginRole = "WORKER" | "ADMIN";

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

  const data = await res.json().catch(() => ({}));
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
    () => id.trim() && pw.trim() && !loading,
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

      if (!res.success) {
        alert(res.message);
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
        },
      });

      navigate(d.role === "WORKER" ? "/worker/attend" : "/admin/dashboard", {
        replace: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] text-center">
        {/* Logo */}
        <h1 className="mb-2 text-[40px] font-black tracking-tight text-blue-600">
          Lookie
        </h1>
        <p className="mb-10 text-sm font-semibold text-slate-400">
          아이디와 비밀번호를 입력해 주세요
        </p>

        {/* Login Card */}
        <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm text-left">
          <FieldRow
            icon={<Phone size={18} />}
            placeholder="아이디(전화번호)"
            value={id}
            onChange={setId}
            type="tel"
          />
          <Divider />
          <FieldRow
            icon={<Lock size={18} />}
            placeholder="비밀번호"
            value={pw}
            onChange={setPw}
            type="password"
          />
        </div>

        {/* Forgot password */}
        <div className="mt-4 text-right">
          <button
            onClick={() => navigate("/auth/password/forgot")}
            className="text-sm font-bold text-blue-600"
          >
            비밀번호 찾기
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!canSubmit}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-[18px]
            bg-blue-600 text-[16px] font-black text-white
            disabled:bg-blue-200 transition active:scale-[0.99]"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* Signup */}
        <button
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
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="text-slate-400">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[15px] font-bold
          text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
