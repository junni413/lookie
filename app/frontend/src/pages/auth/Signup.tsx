import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const isDev = false;

type FieldErrors = Partial<{
  name: string;
  phone: string;
  email: string;
  emailCode: string;
  birth: string;
  pw: string;
  pw2: string;
}>;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ✅ Backend(UserService) 규칙과 통일
const PHONE_PATTERN = /^010\d{8}$/; // 하이픈 없이 010 + 8자리 = 11자리
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{7,15}$/; // 7~15자, 영문+숫자 필수

const isValidPhone = (v: string) => PHONE_PATTERN.test(onlyDigits(v));
const isValidPassword = (v: string) => PASSWORD_PATTERN.test(v);

const PASSWORD_HELP =
  "비밀번호는 7~15자의 영문, 숫자 조합이어야 합니다. (특수문자 @$!%*#?& 사용 가능)";

// ✅ 생년월일: yyyy-mm-dd (백으로 보낼 포맷)
const BIRTH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isValidBirth = (v: string) => BIRTH_PATTERN.test(v);

// 보기용 포맷 (입력은 010-1234-5678 형태로)
function formatPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

// ----- API helpers -----
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

function getErrCode(err: any): string | null {
  return (
    err?.response?.data?.code ??
    err?.response?.data?.errorCode ??
    err?.response?.data?.error_code ??
    null
  );
}

function getErrMessage(err: any): string | null {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.errorMessage ??
    err?.response?.data?.error_message ??
    null
  );
}

function formatSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

// -------------------------------------------------------------

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birth, setBirth] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [phoneVerified, setPhoneVerified] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">(
    "idle"
  );
  const [emailCode, setEmailCode] = useState("");
  const [emailExpiresAt, setEmailExpiresAt] = useState<number | null>(null);
  const [emailLeftSec, setEmailLeftSec] = useState(0);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLeftSec, setCooldownLeftSec] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});

  const isEmailExpired =
    emailExpiresAt !== null ? Date.now() >= emailExpiresAt : false;
  const isCooldown = cooldownUntil !== null ? Date.now() < cooldownUntil : false;

  useEffect(() => {
    setEmailVerified(false);
    setEmailStep("idle");
    setEmailCode("");
    setEmailExpiresAt(null);
    setEmailLeftSec(0);
    setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
  }, [email]);

  useEffect(() => {
    if (!emailExpiresAt) return;
    const tick = () => {
      const sec = Math.max(0, Math.ceil((emailExpiresAt - Date.now()) / 1000));
      setEmailLeftSec(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [emailExpiresAt]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const sec = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownLeftSec(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!name.trim()) next.name = "이름을 입력해주세요.";

    if (!phone.trim()) next.phone = "전화번호를 입력해주세요.";
    else if (!isValidPhone(phone))
      next.phone = "전화번호는 010으로 시작하는 11자리 숫자여야 합니다.";
    else if (!phoneVerified) next.phone = "전화번호 중복확인을 완료해주세요.";

    if (!email.trim()) next.email = "이메일을 입력해주세요.";
    else if (!isValidEmail(email)) next.email = "이메일 형식을 확인해주세요.";
    else if (!emailVerified) next.email = "이메일 인증을 완료해주세요.";

    if (!birth.trim()) next.birth = "생년월일을 입력해주세요.";
    else if (!isValidBirth(birth)) next.birth = "생년월일 형식을 확인해주세요. (YYYY-MM-DD)";

    if (!pw.trim()) next.pw = "비밀번호를 입력해주세요.";
    else if (!isValidPassword(pw)) next.pw = PASSWORD_HELP;

    if (!pw2.trim()) next.pw2 = "비밀번호 확인을 입력해주세요.";
    else if (pw !== pw2) next.pw2 = "비밀번호가 일치하지 않습니다.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      isValidPhone(phone) &&
      email.trim() &&
      isValidEmail(email) &&
      birth.trim() &&
      isValidBirth(birth) &&
      isValidPassword(pw) &&
      pw === pw2 &&
      phoneVerified &&
      emailVerified
    );
  }, [name, phone, email, birth, pw, pw2, phoneVerified, emailVerified]);

  // ---------- handlers ----------
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await postJSON("/api/auth/signup", {
        name,
        phoneNumber: onlyDigits(phone),
        email,
        birthDate: birth,
        password: pw,
      });

      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (err: any) {
      const code = getErrCode(err);
      if (code === "USER_001") {
        setErrors((p) => ({ ...p, phone: "이미 가입된 전화번호입니다." }));
      } else if (code === "USER_002") {
        setErrors((p) => ({ ...p, email: "이미 가입된 이메일입니다." }));
      } else if (code === "AUTH_006") {
        setErrors((p) => ({ ...p, email: "이메일 인증이 필요합니다." }));
      } else {
        alert(getErrMessage(err) ?? "회원가입에 실패했습니다.");
      }
    }
  };

  const handlePhoneDup = async () => {
    const digits = onlyDigits(phone);

    if (!PHONE_PATTERN.test(digits)) {
      setErrors((prev) => ({
        ...prev,
        phone: "전화번호는 010으로 시작하는 11자리 숫자여야 합니다.",
      }));
      return;
    }

    if (isDev) {
      setPhoneVerified(true);
      setErrors((prev) => ({ ...prev, phone: undefined }));
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, phone: undefined }));
      // ✅ 백엔드 SignupRequest DTO 필드명에 맞춰 phone -> phoneNumber로 수정함
      await postJSON("/api/auth/check/phone", { phoneNumber: digits });
      setPhoneVerified(true);
      alert("사용 가능한 전화번호입니다.");
    } catch (err: any) {
      const code = getErrCode(err);
      setPhoneVerified(false);
      if (code === "USER_001") {
        setErrors((prev) => ({ ...prev, phone: "이미 가입된 전화번호입니다." }));
      } else {
        setErrors((prev) => ({
          ...prev,
          phone: getErrMessage(err) ?? "전화번호 확인에 실패했습니다.",
        }));
      }
    }
  };

  const handleEmailSendCode = async () => {
    if (!isValidEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "이메일 형식을 확인해주세요." }));
      return;
    }
    if (isCooldown) {
      setErrors((prev) => ({
        ...prev,
        email: `1분 내 재발송이 제한됩니다. (${formatSec(cooldownLeftSec)})`,
      }));
      return;
    }

    if (isDev) {
      setEmailStep("sent");
      setEmailExpiresAt(Date.now() + 5 * 60 * 1000);
      setCooldownUntil(Date.now() + 60 * 1000);
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
      return;
    }

    try {
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
      await postJSON("/api/auth/email/send-code", { email });
      setEmailStep("sent");
      setEmailExpiresAt(Date.now() + 5 * 60 * 1000);
      setCooldownUntil(Date.now() + 60 * 1000);
    } catch (err: any) {
      const code = getErrCode(err);
      if (code === "USER_002") {
        setErrors((p) => ({ ...p, email: "이미 가입된 이메일입니다." }));
      } else if (code === "AUTH_005") {
        setCooldownUntil(Date.now() + 60 * 1000);
        setErrors((p) => ({ ...p, email: "1분 내 재발송이 제한됩니다." }));
      } else {
        setErrors((p) => ({
          ...p,
          email: getErrMessage(err) ?? "이메일 발송에 실패했습니다.",
        }));
      }
    }
  };

  const handleEmailConfirmCode = async () => {
    if (!isValidEmail(email)) return;
    if (!emailCode.trim()) {
      setErrors((p) => ({ ...p, emailCode: "인증번호를 입력해주세요." }));
      return;
    }
    if (isEmailExpired) {
      setErrors((p) => ({ ...p, emailCode: "인증번호가 만료되었습니다." }));
      return;
    }

    if (isDev) {
      setEmailVerified(true);
      setEmailStep("verified");
      return;
    }

    try {
      setErrors((p) => ({ ...p, emailCode: undefined }));
      await postJSON("/api/auth/email/verify", { email, code: emailCode });
      setEmailVerified(true);
      setEmailStep("verified");
    } catch (err: any) {
      setEmailVerified(false);
      setErrors((p) => ({
        ...p,
        emailCode: "인증번호가 일치하지 않습니다.",
      }));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-[430px]">
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
                onChange={(e) => {
                  if (phoneVerified) setPhoneVerified(false);
                  const digits = onlyDigits(e.target.value);
                  setPhone(formatPhone(digits));
                }}
                placeholder="010-0000-0000"
                className={inputClass(!!errors.phone)}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={handlePhoneDup}
                className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${phoneVerified
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
                disabled={emailStep === "verified"}
              />
              <button
                type="button"
                onClick={handleEmailSendCode}
                disabled={emailStep === "verified" || isCooldown}
                className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${emailStep === "verified"
                    ? "bg-blue-50 text-blue-600"
                    : isCooldown
                      ? "bg-gray-100 text-gray-400"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
              >
                {emailStep === "verified"
                  ? "인증완료"
                  : isCooldown
                    ? formatSec(cooldownLeftSec)
                    : "인증하기"}
              </button>
            </div>

            {emailStep === "sent" && (
              <div className="mt-2">
                <div className="flex gap-2">
                  <input
                    value={emailCode}
                    onChange={(e) =>
                      setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="인증번호 6자리"
                    className={inputClass(!!errors.emailCode)}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={handleEmailConfirmCode}
                    disabled={isEmailExpired}
                    className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${isEmailExpired
                        ? "bg-gray-100 text-gray-400"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                  >
                    확인
                  </button>
                  <div className="flex items-center text-xs text-gray-400">
                    {isEmailExpired ? "만료됨" : formatSec(emailLeftSec)}
                  </div>
                </div>
                {errors.emailCode && (
                  <div className="mt-2 text-xs text-red-500">{errors.emailCode}</div>
                )}
              </div>
            )}
          </Field>

          <Field label="생년월일" error={errors.birth}>
            <input
              type="date"
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className={inputClass(!!errors.birth)}
            />
          </Field>

          <Field label="비밀번호" error={errors.pw}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="********"
              className={inputClass(!!errors.pw)}
            />
            <div className="mt-2 text-[11px] text-gray-400">{PASSWORD_HELP}</div>
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
            className={`mt-6 w-full rounded-full py-4 text-base font-semibold transition ${canSubmit
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