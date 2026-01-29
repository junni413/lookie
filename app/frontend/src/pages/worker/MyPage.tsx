import { useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

type Ctx = { setTitle: (t: string) => void };

export default function MyPage() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  useEffect(() => setTitle("마이페이지"), [setTitle]);

  const user = useMemo(
    () => ({
      name: "김싸피",
      phone: "010-0000-0000",
      birth: "2000.00.00",
      email: "ssafy@gmail.com",
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border">
        <div className="space-y-4">
          <Field label="이름" value={user.name} />
          <Field label="전화번호" value={user.phone} />
          <Field label="생년월일" value={user.birth} />
          <Field label="이메일" value={user.email} />
        </div>

        {/* ✅ 여기: 마이페이지 하단 버튼은 '내 정보 수정'으로 이동 */}
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
