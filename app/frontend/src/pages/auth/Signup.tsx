import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const isDev = import.meta.env.DEV;

type FieldErrors = Partial<{
  name: string;
  phone: string;
  email: string;
  pw: string;
  pw2: string;
}>;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // 인증 상태 (임시)
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!name.trim()) next.name = "이름을 입력해주세요.";

    if (!phone.trim()) next.phone = "전화번호를 입력해주세요.";
    else if (onlyDigits(phone).length < 10)
      next.phone = "전화번호 형식을 확인해주세요.";

    if (!email.trim()) next.email = "이메일을 입력해주세요.";
    else if (!isValidEmail(email))
      next.email = "이메일 형식을 확인해주세요.";

    if (!pw.trim()) next.pw = "비밀번호를 입력해주세요.";
    else if (pw.length < 8)
      next.pw = "비밀번호는 8자 이상이어야 합니다.";

    if (!pw2.trim()) next.pw2 = "비밀번호 확인을 입력해주세요.";
    else if (pw !== pw2)
      next.pw2 = "비밀번호가 일치하지 않습니다.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      phone.trim() &&
      email.trim() &&
      pw.trim().length >= 8 &&
      pw === pw2
    );
  }, [name, phone, email, pw, pw2]);

  const handleSubmit = async () => {
    if (!validate()) return;

    if (isDev) {
      alert("현재는 회원가입 API 미연동 상태입니다. (UI/유효성만 구현)");
      return;
    }

    try {
      // TODO: Day5 - 회원가입 API 연동
    } catch {
      alert("회원가입에 실패했습니다.");
    }
  };

  const handlePhoneDup = () => {
    if (onlyDigits(phone).length < 10) {
      setErrors((prev) => ({
        ...prev,
        phone: "전화번호 형식을 확인해주세요.",
      }));
      return;
    }
    setPhoneVerified(true);
    setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleEmailVerify = () => {
    if (!isValidEmail(email)) {
      setErrors((prev) => ({
        ...prev,
        email: "이메일 형식을 확인해주세요.",
      }));
      return;
    }
    setEmailVerified(true);
    setErrors((prev) => ({ ...prev, email: undefined }));
  };

  return (
    <div className="min-h-[100dvh] bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-[430px]">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-blue-600">Lookie</h1>
        </div>

        <div className="space-y-4">
          <Field label="이름" error={errors.name}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="김싸피"
              className={inputClass(!!errors.name)}
            />
          </Field>

          <Field label="전화번호" error={errors.phone}>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value))}
                placeholder="010-0000-0000"
                className={inputClass(!!errors.phone)}
              />
              <button
                type="button"
                onClick={handlePhoneDup}
                className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${
                  phoneVerified
                    ? "bg-blue-50 text-blue-600"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {phoneVerified ? "확인완료" : "중복확인"}
              </button>
            </div>
          </Field>

          <Field label="이메일" error={errors.email}>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ssafy@gmail.com"
                className={inputClass(!!errors.email)}
              />
              <button
                type="button"
                onClick={handleEmailVerify}
                className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${
                  emailVerified
                    ? "bg-blue-50 text-blue-600"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {emailVerified ? "인증완료" : "인증하기"}
              </button>
            </div>
          </Field>

          <Field label="비밀번호" error={errors.pw}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="********"
              className={inputClass(!!errors.pw)}
            />
          </Field>

          <Field label="비밀번호 확인" error={errors.pw2}>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="********"
              className={inputClass(!!errors.pw2)}
            />
          </Field>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`mt-6 w-full rounded-full py-4 text-base font-semibold transition ${
              canSubmit
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            회원가입
          </button>

          <div className="pt-3 text-center text-sm text-gray-400">
            이미 회원이세요?{" "}
            <span
              className="cursor-pointer text-blue-600"
              onClick={() => navigate("/login")}
            >
              로그인하기
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-2xl bg-slate-100 px-5 py-4 text-sm outline-none",
    "focus:ring-2 focus:ring-blue-500",
    hasError ? "ring-2 ring-red-400 focus:ring-red-400" : "",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-gray-500">{label}</div>
      {children}
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
