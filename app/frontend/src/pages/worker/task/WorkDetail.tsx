import { useEffect } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";

type AssignedTask = { zone: string; line: string; count: number };

export default function WorkDetail() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();
  const navigate = useNavigate();
  const { state } = useLocation();

  const task = (state as any)?.task as AssignedTask | undefined;
  const toteBarcode = (state as any)?.toteBarcode as string | undefined;

  useEffect(() => setTitle("작업 진행"), [setTitle]);

  useEffect(() => {
    if (!task || !toteBarcode) navigate("/worker/home", { replace: true });
  }, [task, toteBarcode, navigate]);

  if (!task || !toteBarcode) return null;

  // ✅ 프론트 더미 상품 데이터 (나중에 API)
  const product = {
    name: "[K365] 유명산지 고당도 사과",
    sku: "SKU-887421_KR",
    location: "A-12-03",
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold">토트 스캔 완료</p>
        <p className="mt-1 text-xs text-gray-500">토트 바코드: {toteBarcode}</p>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-lg font-extrabold">지번과 상품을 스캔해주세요.</p>

        <div className="mt-4 flex gap-3">
          <div className="h-28 w-28 rounded-2xl bg-gray-100" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">상품명</p>
            <p className="text-sm font-extrabold">{product.name}</p>

            <p className="mt-3 text-xs text-gray-500">상품 코드</p>
            <p className="text-sm font-extrabold">{product.sku}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="h-20 rounded-2xl border bg-white text-sm font-semibold">
            지번 스캔
            <div className="mt-1 text-xs text-gray-500">{product.location}</div>
          </button>
          <button className="h-20 rounded-2xl border bg-white text-sm font-semibold">
            상품 스캔
            <div className="mt-1 text-xs text-gray-500">{product.location}</div>
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <button className="h-14 rounded-2xl bg-yellow-300 text-base font-extrabold">
            이슈 발생 신고
          </button>
          <button className="h-14 rounded-2xl bg-blue-600 text-base font-extrabold text-white">
            다음 작업 진행
          </button>
        </div>
      </section>
    </div>
  );
}
