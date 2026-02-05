import type { MouseEvent } from "react";

export type IssueType = "DAMAGED" | "OUT_OF_STOCK";

const ISSUE_OPTIONS: { key: IssueType; title: string; desc: string }[] = [
  { key: "DAMAGED", title: "상품 파손", desc: "파손되거나 손상된 상품 발견" },
  { key: "OUT_OF_STOCK", title: "재고 없음", desc: "해당 위치에 상품이 없음" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: IssueType) => void;
  loadingKey?: IssueType | null;
};

export default function IssueSelectSheet({
  open,
  onClose,
  onSelect,
  loadingKey,
}: Props) {
  if (!open) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();
  const disabled = !!loadingKey;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      onClick={disabled ? undefined : onClose}
    >
      {/* dim: 클릭 가로채지 않게 */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      {/* card */}
      <div
        onClick={stop}
        className="relative z-10 w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl"
      >
        {/* X: 무조건 닫힘 */}
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          aria-label="닫기"
        >
          ✕
        </button>

        <div className="pr-10">
          <p className="text-base font-extrabold">어떤 이슈가 발생했나요?</p>
          <p className="mt-1 text-sm text-gray-500">
            선택 즉시 신고가 접수됩니다.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {ISSUE_OPTIONS.map((opt) => {
            const isLoading = loadingKey === opt.key;

            return (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                disabled={disabled}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-4 text-left hover:bg-gray-100 disabled:opacity-60"
              >
                <div>
                  <div className="text-sm font-extrabold">{opt.title}</div>
                  <div className="mt-1 text-xs text-gray-500">{opt.desc}</div>
                </div>

                <div className="ml-3 text-gray-400">
                  {isLoading ? (
                    <span className="text-xs text-gray-500">전송중…</span>
                  ) : (
                    <span className="text-lg">→</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
