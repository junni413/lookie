import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "../../components/layout/MobileLayout";

export default function Home() {
  const { setTitle } = useOutletContext<MobileLayoutContext>();

  useEffect(() => {
    setTitle("홈");
  }, [setTitle]);

  const notices = [
    { id: 1, title: "미할당 요청 3건", desc: "새 판정 요청이 대기 중이에요." },
    { id: 2, title: "이슈 리포트 1건", desc: "파손 의심 건이 등록됐어요." },
    { id: 3, title: "작업 지연 알림", desc: "B구역 처리 속도가 느려요." },
  ];

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">오늘 요약</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">진행</p>
            <p className="text-lg font-bold">4</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">완료</p>
            <p className="text-lg font-bold">12</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">대기</p>
            <p className="text-lg font-bold">3</p>
          </div>
        </div>
      </section>

      {/* 알림/이슈 */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">알림</h2>
        <ul className="mt-3 space-y-2">
          {notices.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-1 text-xs text-gray-500">{n.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 바로가기 */}
      <section className="grid grid-cols-2 gap-2">
        <button className="rounded-xl bg-black p-4 text-left text-white">
          <p className="text-sm font-semibold">작업 시작</p>
          <p className="mt-1 text-xs opacity-80">오늘 작업을 시작해요</p>
        </button>
        <button className="rounded-xl border bg-white p-4 text-left">
          <p className="text-sm font-semibold">이슈 등록</p>
          <p className="mt-1 text-xs text-gray-500">파손/오류를 남겨요</p>
        </button>
      </section>
    </div>
  );
}
