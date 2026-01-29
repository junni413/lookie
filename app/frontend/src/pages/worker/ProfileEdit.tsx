import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

type Ctx = { setTitle: (t: string) => void };

export default function ProfileEdit() {
  const { setTitle } = useOutletContext<Ctx>();
  const navigate = useNavigate();

  useEffect(() => setTitle("내 정보 수정"), [setTitle]);

  const init = useMemo(
    () => ({
      name: "김싸피",
      phone: "010-0000-0000",
      birth: "2000.00.00",
      email: "ssafy@gmail.com",
    }),
    []
  );

  const [name, setName] = useState(init.name);
  const [phone, setPhone] = useState(init.phone);
  const [birth, setBirth] = useState(init.birth);
  const [email, setEmail] = useState(init.email);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border space-y-4">
        <LabeledInput label="이름" value={name} onChange={setName} />
        <LabeledInput label="전화번호" value={phone} onChange={setPhone} />
        <LabeledInput label="생년월일" value={birth} onChange={setBirth} />
        <LabeledInput label="이메일" value={email} onChange={setEmail} />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => alert("TODO: 저장 API 연동")}
            className="flex-1 h-11 rounded-full bg-blue-600 text-white font-semibold shadow-sm active:scale-[0.99] transition"
          >
            저장
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
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}
