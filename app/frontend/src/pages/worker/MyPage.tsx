import { useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { User, Phone, Calendar, Mail, ChevronRight } from "lucide-react";

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

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (token && !user) {
      fetchMe().catch(() => { });
    }
  }, [token, user, fetchMe]);

  const view = useMemo(
    () => ({
      name: user?.name || "작업자",
      phone: formatPhone(user?.phoneNumber),
      birth: user?.birthDate || "-",
      email: user?.email || "-",
    }),
    [user]
  );

  if (!token || !user) return null;

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col items-center justify-center py-6">

        <h2 className="mt-4 text-[22px] font-black tracking-tight text-slate-900">
          {view.name}님
        </h2>
        <p className="text-[13px] font-semibold text-slate-400">
          오늘도 안전하게 근무하세요
        </p>
      </div>

      {/* Info List */}
      <div className="space-y-2 rounded-[32px] border border-slate-50 bg-white p-6 shadow-2xl shadow-slate-100/50">
        <div className="px-4 pb-2">
          <p className="text-[12x] font-black text-slate-400 uppercase tracking-widest">내 프로필</p>
        </div>
        <InfoRow icon={User} label="이름" value={view.name} />
        <InfoRow icon={Phone} label="전화번호" value={view.phone} />
        <InfoRow icon={Calendar} label="생년월일" value={view.birth} />
        <InfoRow icon={Mail} label="이메일" value={view.email} />
      </div>

      {/* Action Button */}
      <div className="mt-auto px-2 pb-4">
        <button
          onClick={() => navigate("/worker/profile/edit")}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-[24px] bg-[#304FFF] text-[17px] font-black text-white shadow-xl shadow-[#304FFF]/10 transition-all active:scale-[0.98]"
        >
          내 정보 수정하기
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      </div>

      <footer className="mt-auto py-20 text-center text-xs font-bold tracking-[0.2em] text-slate-200">
        LOOKie
      </footer>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex items-center rounded-2xl px-4 py-3 transition-colors hover:bg-slate-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-white group-hover:text-[#304FFF]">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="ml-4 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-extrabold text-slate-800">{value}</p>
      </div>
    </div>
  );
}