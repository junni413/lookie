import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

type Ctx = { setTitle: (t: string) => void };

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T | null; // ✅ null 가능
};

async function postJSON<T>(url: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
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

async function patchJSON<T>(url: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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

async function deleteJSON<T>(url: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ✅ 백 규칙 통일: 7~15자, 영문+숫자 필수, 특수문자 선택
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{7,15}$/;
function isValidPassword(v: string) {
  return PASSWORD_REGEX.test(v);
}

function formatPhone(digits?: string) {
  if (!digits) return "-";
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** ✅ 서버 LocalDate가 받기 좋은 형태로 정규화: YYYY-MM-DD */
function normalizeBirthDate(v: string) {
  const x = (v ?? "").trim();
  if (!x) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x; // YYYY-MM-DD
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(x)) return x.replaceAll(".", "-"); // YYYY.MM.DD
  if (/^\d{8}$/.test(x)) return `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}`; // ✅ YYYYMMDD

  return x;
}

function formatSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export default function ProfileEdit() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => setTitle("내 정보 수정"), [setTitle]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (token && !user) {
      fetchMe().catch(() => { });
    }
  }, [token, user, fetchMe, navigate]);

  if (!token || !user) return null;

  const init = useMemo(
    () => ({
      name: user.name ?? "",
      phoneNumber: user.phoneNumber ?? "",
      birthDate: user.birthDate ?? "",
      email: user.email ?? "",
    }),
    [user]
  );

  const [name, setName] = useState(init.name);
  const [birthDate, setBirthDate] = useState(init.birthDate);
  const [email, setEmail] = useState(init.email);

  // 비밀번호는 선택 입력
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // 회원 탈퇴 관련
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  // user 갱신되면 폼 동기화
  useEffect(() => {
    setName(init.name);
    setBirthDate(init.birthDate);
    setEmail(init.email);
    setPw("");
    setPw2("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init.name, init.birthDate, init.email]);

  const emailChanged = email.trim() !== init.email.trim();

  // 이메일 인증 상태 (이메일 바뀌면 다시 해야 함)
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">("idle");
  const [emailCode, setEmailCode] = useState("");
  const [emailExpiresAt, setEmailExpiresAt] = useState<number | null>(null);
  const [emailLeftSec, setEmailLeftSec] = useState(0);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLeftSec, setCooldownLeftSec] = useState(0);

  const isEmailExpired = emailExpiresAt !== null ? Date.now() >= emailExpiresAt : false;
  const isCooldown = cooldownUntil !== null ? Date.now() < cooldownUntil : false;

  // 이메일이 바뀌면 인증 리셋
  useEffect(() => {
    setEmailStep("idle");
    setEmailCode("");
    setEmailExpiresAt(null);
    setEmailLeftSec(0);
    setCooldownUntil(null);
    setCooldownLeftSec(0);
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

  const [saving, setSaving] = useState(false);

  // 비번 변경 의도 여부
  const wantsPwChange = pw.trim().length > 0 || pw2.trim().length > 0;

  const canSave = useMemo(() => {
    if (saving) return false;
    if (!name.trim()) return false;

    const bd = normalizeBirthDate(birthDate);
    if (!bd) return false;

    if (!email.trim() || !isValidEmail(email)) return false;

    // 이메일이 바뀌면 인증 완료 필요
    if (emailChanged && emailStep !== "verified") return false;

    // 비번 변경이면 규칙+일치 필요
    if (wantsPwChange) {
      if (!isValidPassword(pw)) return false;
      if (pw !== pw2) return false;
    }

    return true;
  }, [saving, name, birthDate, email, emailChanged, emailStep, wantsPwChange, pw, pw2]);

  const handleEmailSendCode = async () => {
    if (!emailChanged) {
      alert("이메일을 변경한 뒤 인증해주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("이메일 형식을 확인해주세요.");
      return;
    }
    if (isCooldown) {
      alert(`1분 내 재발송이 제한됩니다. (${formatSec(cooldownLeftSec)})`);
      return;
    }

    try {
      // ✅ 마이페이지 이메일 변경 인증번호 요청 API로 수정
      await postJSON<ApiResponse<null>>(
        "/api/users/me/email/otp/request",
        { newEmail: email.trim() },
        token
      );

      setEmailStep("sent");
      setEmailExpiresAt(Date.now() + 5 * 60 * 1000); // 5분
      setCooldownUntil(Date.now() + 60 * 1000); // 1분
    } catch (err: any) {
      const code = getErrCode(err);
      if (code === "USER_002") {
        alert("이미 가입된 이메일입니다.");
        return;
      }
      alert(getErrMessage(err) ?? "이메일 인증코드 발송에 실패했습니다.");
    }
  };

  const handleEmailConfirmCode = async () => {
    if (!emailChanged) {
      alert("이메일을 변경한 뒤 인증해주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("이메일 형식을 확인해주세요.");
      return;
    }
    if (!emailCode.trim()) {
      alert("인증번호를 입력해주세요.");
      return;
    }
    if (isEmailExpired) {
      alert("인증번호가 만료되었습니다. 재전송해주세요.");
      return;
    }

    try {
      // ✅ 마이페이지 이메일 변경 인증번호 검증 API로 수정
      await postJSON<ApiResponse<null>>(
        "/api/users/me/email/otp/verify",
        {
          newEmail: email.trim(),
          code: emailCode,
        },
        token
      );

      setEmailStep("verified");
    } catch (err: any) {
      alert(getErrMessage(err) ?? "인증에 실패했습니다.");
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    if (emailChanged && emailStep !== "verified") {
      alert("이메일 변경 시 인증이 필요합니다.");
      return;
    }

    if (wantsPwChange) {
      if (!isValidPassword(pw)) {
        alert("비밀번호는 7~15자의 영문+숫자 조합이어야 합니다.");
        return;
      }
      if (pw !== pw2) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    try {
      setSaving(true);

      const body: any = {
        name: name.trim(),
        birthDate: normalizeBirthDate(birthDate),
      };

      // ✅ 이메일이 실제로 변경된 경우에만 포함 (백엔드 403 Forbidden 방지)
      if (emailChanged) {
        body.email = email.trim();
      }

      // 비번 변경을 원할 때만 포함
      if (wantsPwChange) body.password = pw;

      await patchJSON<ApiResponse<null>>("/api/users/me", body, token);

      await fetchMe();
      alert("저장되었습니다.");
      navigate(-1);
    } catch (err: any) {
      alert(getErrMessage(err) ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePw.trim()) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    if (!confirm("정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 정보가 삭제되며 복구할 수 없습니다.")) {
      return;
    }

    try {
      setDeleting(true);
      await deleteJSON<ApiResponse<null>>("/api/users/me", { password: deletePw }, token);

      alert("회원 탈퇴가 완료되었습니다.");
      // 로그아웃 처리 및 이동
      const logout = useAuthStore.getState().logout;
      if (logout) logout();
      navigate("/", { replace: true });
    } catch (err: any) {
      alert(getErrMessage(err) ?? "회원 탈퇴에 실패했습니다. 비밀번호를 확인해주세요.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border space-y-4">
        <LabeledInput label="이름" value={name} onChange={setName} />

        <LabeledInput label="전화번호" value={formatPhone(init.phoneNumber)} onChange={() => { }} disabled />

        <LabeledInput label="생년월일" value={birthDate} onChange={setBirthDate} placeholder="YYYY-MM-DD" />

        {/* 이메일 + 인증 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500">이메일</div>

          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={handleEmailSendCode}
              disabled={!emailChanged || emailStep === "verified" || isCooldown}
              className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${emailStep === "verified"
                ? "bg-blue-50 text-blue-600"
                : !emailChanged || isCooldown
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
            >
              {emailStep === "verified" ? "인증완료" : isCooldown ? formatSec(cooldownLeftSec) : "인증하기"}
            </button>
          </div>

          {emailChanged && emailStep === "sent" && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={handleEmailConfirmCode}
                  disabled={isEmailExpired}
                  className={`min-w-[92px] rounded-xl px-3 text-xs font-semibold ${isEmailExpired ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                >
                  확인
                </button>
                <div className="flex items-center text-xs text-gray-400">
                  {isEmailExpired ? "만료됨" : formatSec(emailLeftSec)}
                </div>
              </div>

              {isEmailExpired && (
                <div className="text-xs text-gray-400">인증번호가 만료되었습니다. 인증하기로 재전송해주세요.</div>
              )}
            </div>
          )}

          {emailChanged && emailStep !== "verified" && (
            <div className="text-xs text-gray-400">이메일을 변경하면 인증 후 저장할 수 있어요.</div>
          )}
        </div>

        {/* 비밀번호 변경(선택) */}
        <div className="pt-2 border-t" />

        <div className="text-sm font-semibold text-gray-800">비밀번호 변경</div>
        <div className="text-xs text-gray-400">변경하지 않으려면 비워두세요. (7~15자, 영문+숫자 필수)</div>

        <LabeledInput label="새 비밀번호" value={pw} onChange={setPw} type="password" placeholder="********" />
        <LabeledInput label="새 비밀번호 확인" value={pw2} onChange={setPw2} type="password" placeholder="********" />

        {wantsPwChange && !isValidPassword(pw) && pw.length > 0 && (
          <div className="text-xs text-red-500">비밀번호는 7~15자의 영문+숫자 조합이어야 합니다.</div>
        )}

        {wantsPwChange && pw2.length > 0 && pw !== pw2 && (
          <div className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`flex-1 h-11 rounded-full font-semibold shadow-sm active:scale-[0.99] transition ${canSave ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
              }`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-11 rounded-full border bg-white text-gray-700 font-semibold hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>

      {/* 회원 탈퇴 버튼 */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-gray-400 underline hover:text-red-400 transition"
        >
          회원 탈퇴하기
        </button>
      </div>

      {/* 회원 탈퇴 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900">회원 탈퇴</h3>
            <p className="mt-2 text-sm text-gray-500">
              계정을 삭제하시려면 현재 비밀번호를 입력해주세요.
            </p>

            <div className="mt-4">
              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="현재 비밀번호"
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePw("");
                }}
                className="flex-1 h-11 rounded-xl border bg-white text-gray-700 font-semibold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePw.trim()}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 disabled:bg-gray-200"
              >
                {deleting ? "탈퇴 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  disabled,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <input
        value={value}
        disabled={disabled}
        type={type ?? "text"}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 ${disabled ? "bg-gray-50 text-gray-500" : ""
          }`}
      />
    </div>
  );
}
