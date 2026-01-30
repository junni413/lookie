import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const isDev = false;

type FieldErrors = Partial<{
  name: string;
  phone: string;
  email: string;
  emailCode: string;
  pw: string;
  pw2: string;
}>;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// 비밀번호 규칙은 팀 규칙에 맞게 수정 가능 (현재: 8자 이상)
const isValidPassword = (v: string) => v.length >= 8;

// ----- API helpers (프로젝트 axios 인스턴스 있으면 교체) -----
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 응답이 비어있을 수도 있음
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
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // 전화번호: 인증(SMS) 아님. "중복확인" 완료 여부
  const [phoneVerified, setPhoneVerified] = useState(false);

  // 이메일 인증 상태
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">(
    "idle"
  );
  const [emailCode, setEmailCode] = useState("");
  const [emailExpiresAt, setEmailExpiresAt] = useState<number | null>(null);
  const [emailLeftSec, setEmailLeftSec] = useState(0);

  // 재전송 쿨다운(1분) - AUTH_005 대응
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLeftSec, setCooldownLeftSec] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});

  const isEmailExpired =
    emailExpiresAt !== null ? Date.now() >= emailExpiresAt : false;
  const isCooldown = cooldownUntil !== null ? Date.now() < cooldownUntil : false;

  // email 변경 시 인증 상태 리셋
  useEffect(() => {
    setEmailVerified(false);
    setEmailStep("idle");
    setEmailCode("");
    setEmailExpiresAt(null);
    setEmailLeftSec(0);
    setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
  }, [email]);

  // 만료 타이머
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

  // 쿨다운 타이머
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
    else if (onlyDigits(phone).length < 10)
      next.phone = "전화번호 형식을 확인해주세요.";
    else if (!phoneVerified)
      next.phone = "전화번호 중복확인을 완료해주세요.";

    if (!email.trim()) next.email = "이메일을 입력해주세요.";
    else if (!isValidEmail(email)) next.email = "이메일 형식을 확인해주세요.";
    else if (!emailVerified) next.email = "이메일 인증을 완료해주세요.";

    if (!pw.trim()) next.pw = "비밀번호를 입력해주세요.";
    else if (!isValidPassword(pw)) next.pw = "비밀번호는 8자 이상이어야 합니다.";

    if (!pw2.trim()) next.pw2 = "비밀번호 확인을 입력해주세요.";
    else if (pw !== pw2) next.pw2 = "비밀번호가 일치하지 않습니다.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      phone.trim() &&
      email.trim() &&
      isValidPassword(pw) &&
      pw === pw2 &&
      phoneVerified &&
      emailVerified
    );
  }, [name, phone, email, pw, pw2, phoneVerified, emailVerified]);

  // ---------- handlers ----------
  const handleSubmit = async () => {
    if (!validate()) return;

    if (isDev) {
      alert("현재는 회원가입 API 미연동 상태입니다. (UI/유효성만 구현)");
      return;
    }

    try {
      await postJSON("/api/auth/signup", {
        name,
        phoneNumber: onlyDigits(phone),
        email,
        password: pw,
      });

      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (err: any) {
      const code = getErrCode(err);
      // 주요 에러 코드별로 필드 에러 매핑 (프로젝트 규칙에 맞춰 수정)
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
    if (digits.length < 10) {
      setErrors((prev) => ({
        ...prev,
        phone: "전화번호 형식을 확인해주세요.",
      }));
      return;
    }

    if (isDev) {
      // 개발 모드에서는 UI만
      setPhoneVerified(true);
      setErrors((prev) => ({ ...prev, phone: undefined }));
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, phone: undefined }));
      // TODO: 실제 중복확인 API로 교체 (예: /api/auth/check/phone)
      // await postJSON("/api/auth/check/phone", { phone: digits });
      setPhoneVerified(true);
    } catch (err: any) {
      const code = getErrCode(err);
      if (code === "USER_001") {
        setPhoneVerified(false);
        setErrors((prev) => ({ ...prev, phone: "이미 가입된 전화번호입니다." }));
      } else {
        setPhoneVerified(false);
        setErrors((prev) => ({
          ...prev,
          phone: getErrMessage(err) ?? "전화번호 확인에 실패했습니다.",
        }));
      }
    }
  };

  // 이메일 인증코드 발송
  const handleEmailSendCode = async () => {
    if (!isValidEmail(email)) {
      setErrors((prev) => ({
        ...prev,
        email: "이메일 형식을 확인해주세요.",
      }));
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
      // 개발 모드: UI만
      setEmailStep("sent");
      setEmailExpiresAt(Date.now() + 5 * 60 * 1000); // 5분
      setCooldownUntil(Date.now() + 60 * 1000); // 1분
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
      return;
    }

    try {
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));

      // TODO: 너희 실제 엔드포인트로 맞추기 (예: /api/auth/email/send-code)
      // 문서에서 200 응답이 { id: 1 } 이었음 → 프론트는 id 필요 없다고 했으니 무시 가능
      await postJSON("/api/auth/email/send-code", { email });

      setEmailStep("sent");

      // TTL(유효시간) 백에서 안 내려주면 프론트는 팀 합의값으로 잡기
      setEmailExpiresAt(Date.now() + 5 * 60 * 1000); // 5분 (필요시 조정)
      setCooldownUntil(Date.now() + 60 * 1000); // 1분
    } catch (err: any) {
      const code = getErrCode(err);

      if (code === "USER_002") {
        setErrors((p) => ({ ...p, email: "이미 가입된 이메일입니다." }));
        return;
      }
      if (code === "AUTH_005") {
        // 1분 제한
        setCooldownUntil(Date.now() + 60 * 1000);
        setErrors((p) => ({ ...p, email: "1분 내 재발송이 제한됩니다." }));
        return;
      }
      if (code === "EMAIL_001") {
        setErrors((p) => ({
          ...p,
          email: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        }));
        return;
      }

      setErrors((p) => ({
        ...p,
        email: getErrMessage(err) ?? "이메일 발송에 실패했습니다.",
      }));
    }
  };

  // 이메일 코드 확인 (email + code 확정)
  const handleEmailConfirmCode = async () => {
    if (!isValidEmail(email)) {
      setErrors((p) => ({ ...p, email: "이메일 형식을 확인해주세요." }));
      return;
    }
    if (!emailCode.trim()) {
      setErrors((p) => ({ ...p, emailCode: "인증번호를 입력해주세요." }));
      return;
    }
    if (isEmailExpired) {
      setErrors((p) => ({ ...p, emailCode: "인증번호가 만료되었습니다. 재전송해주세요." }));
      return;
    }

    if (isDev) {
      setEmailVerified(true);
      setEmailStep("verified");
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));
      return;
    }

    try {
      setErrors((p) => ({ ...p, email: undefined, emailCode: undefined }));

      await postJSON("/api/auth/email/verify", {
        email,
        code: emailCode,
      });

      setEmailVerified(true);
      setEmailStep("verified");
    } catch (err: any) {
      const code = getErrCode(err);

      if (code === "AUTH_007") {
        setEmailVerified(false);
        setErrors((p) => ({
          ...p,
          emailCode: "인증번호가 만료되었거나 일치하지 않습니다.",
        }));
        return;
      }
      setEmailVerified(false);
      setErrors((p) => ({
        ...p,
        emailCode: getErrMessage(err) ?? "인증에 실패했습니다.",
      }));
    }
  };

  // ---------- UI ----------
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
                onChange={(e) => {
                  if (phoneVerified) setPhoneVerified(false);
                  setPhone(onlyDigits(e.target.value));
                }}
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
            {/* 이메일 입력 + 인증코드 발송 */}
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
                className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${
                  emailStep === "verified"
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

            {/* 인증번호 입력 + 확인 (발송 후 노출) */}
            {emailStep === "sent" && (
              <div className="mt-2">
                <div className="flex gap-2">
                  <input
                    value={emailCode}
                    onChange={(e) =>
                      setEmailCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="인증번호 6자리"
                    className={inputClass(!!errors.emailCode)}
                  />
                  <button
                    type="button"
                    onClick={handleEmailConfirmCode}
                    disabled={isEmailExpired}
                    className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${
                      isEmailExpired
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
                  <div className="mt-2 text-xs text-red-500">
                    {errors.emailCode}
                  </div>
                )}

                {isEmailExpired && (
                  <div className="mt-2 text-xs text-gray-400">
                    인증번호가 만료되었습니다. 인증하기로 재전송해주세요.
                  </div>
                )}
              </div>
            )}
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
