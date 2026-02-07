import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { ArrowRight, AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { RebalanceRecommendation } from "@/services/rebalance.api";
import type { DB_Worker } from "@/types/db";

interface RebalanceExecuteModalProps {
    isOpen: boolean;
    onClose: () => void;
    recommendation: RebalanceRecommendation | null;
    workers: DB_Worker[];
    onApply: () => void;
    isApplying: boolean;
}

export default function RebalanceExecuteModal({
    isOpen,
    onClose,
    recommendation,
    workers,
    onApply,
    isApplying
}: RebalanceExecuteModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) setMounted(true);
        else setTimeout(() => setMounted(false), 300);
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    if (!recommendation || recommendation.moves.length === 0) {
        return (
            <div className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                isOpen ? "opacity-100" : "opacity-0"
            )}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full text-center">
                    <p className="text-slate-600 font-medium mb-6">추천할 변경 사항이 없습니다.</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    const { moves } = recommendation;

    const findWorkerName = (id: number) => workers.find(w => w.userId === id)?.name || `Worker #${id}`;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
        )}>
            <div className={cn(
                "bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] transition-transform duration-300",
                isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
            )}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-500 rounded-full inline-block" />
                            AI 재배치 제안
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 pl-4">
                            현재 상황을 분석하여 최적의 인력 배치를 제안합니다.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">이동 인원</span>
                            <span className="text-2xl font-black text-slate-800">{moves.length}명</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">예상 리스크 감소</span>
                            <span className="text-2xl font-black text-green-600">
                                {recommendation.total_expected_risk_reduction ? recommendation.total_expected_risk_reduction.toFixed(1) : '-'}
                            </span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">배치 ID</span>
                            <span className="text-2xl font-black text-blue-600">#{recommendation.batch_id}</span>
                        </div>
                    </div>

                    {/* Move List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-700 mb-2 pl-1">이동 상세 목록</h3>
                        {moves.map((move, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                        {findWorkerName(move.worker_id).charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{findWorkerName(move.worker_id)}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">ID: {move.worker_id}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-sm min-w-[60px] text-center border border-slate-200">
                                            Zone {move.from_zone}
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                        <div className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-sm min-w-[60px] text-center border border-blue-100">
                                            Zone {move.to_zone}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">주의사항</p>
                            <p className="opacity-90 leading-relaxed">
                                적용 시 즉시 해당 작업자들의 배정 구역이 변경되며, 기존 작업은 중단 처리됩니다.
                                변경 내역은 시스템에 기록됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isApplying}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50"
                    >
                        취소
                    </button>
                    <button
                        onClick={onApply}
                        disabled={isApplying}
                        className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center gap-2"
                    >
                        {isApplying ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                적용 중...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                추천 적용하기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
