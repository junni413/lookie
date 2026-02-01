import { useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

type Ctx = { setTitle: (t: string) => void };

function formatPhone(digits?: string) {
  if (!digits) return "-";
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function MyPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => setTitle("마이페이지"), [setTitle]);

  // 로그인 안 됨
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // 새로고침 대응
  useEffect(() => {
    if (token && !user) {
      fetchMe().catch(() => {});
    }
  }, [token, user, fetchMe]);

  if (!token || !user) return null;

  const view = useMemo(
    () => ({
      name: user.name,
      phone: formatPhone(user.phoneNumber),
      birth: user.birthDate ?? "-",
      email: user.email,
    }),
    [user]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border">
        <div className="space-y-4">
          <Field label="이름" value={view.name} />
          <Field label="전화번호" value={view.phone} />
          <Field label="생년월일" value={view.birth} />
          <Field label="이메일" value={view.email} />
        </div>

        <button
          type="button"
          onClick={() => navigate("/worker/profile/edit")}
          className="mt-6 w-full rounded-full bg-blue-600 py-3 text-white font-semibold shadow-sm active:scale-[0.99] transition"
        >
          정보 수정
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="h-11 rounded-xl bg-gray-50 px-3 flex items-center text-sm text-gray-900 border">
        {value}
      </div>
    </div>
  );
}
