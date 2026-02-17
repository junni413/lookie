import { useEffect, useRef, useState } from "react";
import { X, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DB_Worker, ZoneStat } from "@/types/db";
import ManageZoneColumn from "./ManageZoneColumn";
import { rebalanceService } from "@/services/rebalance.api";
import { adminService, type ZoneMoveRequest } from "@/services/adminService";
import { getZoneStyle, mergeZoneData } from "@/utils/zoneUtils";

interface AiReallocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (workers: DB_Worker[], moves?: any[]) => void;
    currentWorkers: DB_Worker[];
    zoneStats: ZoneStat[];
}

export default function AiReallocationModal({
    isOpen,
    onClose,
    onApply,
    currentWorkers,
    zoneStats
}: AiReallocationModalProps) {
    const [simulatedWorkers, setSimulatedWorkers] = useState<DB_Worker[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [simulatedZoneStats, setSimulatedZoneStats] = useState<ZoneStat[]>(zoneStats);
    const simulateTimerRef = useRef<number | null>(null);

    const zoneNameById = new Map<number, string>(zoneStats.map((z) => [z.zoneId, z.name]));
    const zoneStatById = new Map<number, ZoneStat>(simulatedZoneStats.map((z) => [z.zoneId, z]));

    const movedWorkers = simulatedWorkers
        .map((sim) => {
            const orig = currentWorkers.find((c) => c.userId === sim.userId);
            if (!orig || orig.currentZoneId === sim.currentZoneId || sim.currentZoneId == null) return null;
            return {
                workerId: sim.userId,
                name: sim.name,
                fromZoneId: orig.currentZoneId,
                toZoneId: sim.currentZoneId
            };
        })
        .filter(Boolean) as { workerId: number; name?: string; fromZoneId: number; toZoneId: number }[];

    const zoneStatusChanges = zoneStats.map((before) => {
        const after = simulatedZoneStats.find((z) => z.zoneId === before.zoneId) || before;
        return {
            zoneId: before.zoneId,
            name: before.name,
            beforeStatus: before.status,
            afterStatus: after.status,
            beforeCount: before.workerCount ?? 0,
            afterCount: after.workerCount ?? 0
        };
    });

    const formatDuration = (minutes: number) => {
        if (!Number.isFinite(minutes)) return "-";
        const total = Math.max(0, Math.round(minutes));
        const days = Math.floor(total / (60 * 24));
        const hours = Math.floor((total % (60 * 24)) / 60);
        const mins = total % 60;

        if (days > 0) return `${days}일 ${hours}시간`;
        if (hours > 0) return `${hours}시간 ${mins}분`;
        return `${mins}분`;
    };

    const getEtaInfo = (zoneId: number) => {
        const stat = zoneStatById.get(zoneId);
        const deadline = stat?.remainingDeadlineMinutes;
        const eta = stat?.estimatedCompletionMinutes;

        if (!Number.isFinite(deadline as number) || !Number.isFinite(eta as number)) {
            return {
                hasData: false,
                deadlineText: "",
                etaText: "",
                gapText: "시간 정보 없음",
                gapTone: "text-slate-500 bg-slate-100 border-slate-100"
            };
        }

        const deadlineMin = Math.max(0, Math.round(Number(deadline)));
        const etaMin = Math.max(0, Math.round(Number(eta)));
        const gap = deadlineMin - etaMin;
        const isDelayed = stat?.status === "CRITICAL" ? true : gap < 0;

        return {
            hasData: true,
            deadlineText: `남은 마감 ${formatDuration(deadlineMin)}`,
            etaText: `예상 완료 ${formatDuration(etaMin)}`,
            gapText: isDelayed
                ? `지연 ${formatDuration(Math.abs(gap))}`
                : `여유 ${formatDuration(gap)}`,
            gapTone: isDelayed
                ? "text-rose-700 bg-rose-50 border-rose-100"
                : "text-emerald-700 bg-emerald-50 border-emerald-100"
        };
    };

    useEffect(() => {
        const fetchRecommendation = async () => {
            if (!isOpen) return;

            setIsLoading(true);
            try {
                const data = await rebalanceService.recommend();
                setRecommendation(data);

                if (data && data.moves) {
                    const newWorkers = currentWorkers.map((worker) => {
                        const move = data.moves.find((m: any) => m.worker_id === worker.userId);
                        if (move) return { ...worker, currentZoneId: move.to_zone };
                        return worker;
                    });

                    setSimulatedWorkers(newWorkers);

                    const moves: ZoneMoveRequest[] = data.moves.map((m: any) => ({
                        workerId: m.worker_id,
                        toZoneId: m.to_zone
                    }));

                    refreshSimulatedStats(moves);
                } else {
                    setSimulatedWorkers(currentWorkers);
                    setSimulatedZoneStats(zoneStats);
                }
            } catch (err) {
                console.error("AI Rebalance Failed", err);
                setSimulatedWorkers(currentWorkers);
                setSimulatedZoneStats(zoneStats);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendation();
    }, [isOpen, currentWorkers, zoneStats]);

    const refreshSimulatedStats = async (moves: ZoneMoveRequest[]) => {
        try {
            const apiZones = await adminService.simulateZones(moves ?? []);
            setSimulatedZoneStats(mergeZoneData(apiZones));
        } catch (err) {
            console.error("Failed to simulate zone stats", err);
            setSimulatedZoneStats(zoneStats);
        }
    };

    const handleDrop = (workerId: number, targetZoneId: number) => {
        setSimulatedWorkers((prev) => {
            const next = prev.map((w) => (w.userId === workerId ? { ...w, currentZoneId: targetZoneId } : w));

            if (simulateTimerRef.current) {
                window.clearTimeout(simulateTimerRef.current);
            }

            simulateTimerRef.current = window.setTimeout(() => {
                const moves: ZoneMoveRequest[] = [];
                next.forEach((worker) => {
                    const original = currentWorkers.find((c) => c.userId === worker.userId);
                    if (!original) return;
                    if (worker.currentZoneId != null && original.currentZoneId !== worker.currentZoneId) {
                        moves.push({ workerId: worker.userId, toZoneId: worker.currentZoneId });
                    }
                });
                refreshSimulatedStats(moves);
            }, 200);

            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-6 h-[85vh] max-h-[52rem] flex flex-col overflow-hidden border-0 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
                <div className="flex items-center justify-between px-6 py-4 bg-white shrink-0 border-b border-slate-100">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary mr-3 shadow-sm border border-primary-soft">
                            {isLoading ? <Loader2 className="animate-spin" size={20} strokeWidth={2.5} /> : <Wand2 size={20} strokeWidth={2.5} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">AI 추천 재배치</h2>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                {isLoading
                                    ? "AI가 최적 배치를 계산 중입니다..."
                                    : "AI가 제안한 배치를 확인하고 수정할 수 있습니다."}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto p-4 bg-slate-100/50 space-y-3">
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-bold text-slate-800">미리보기 요약</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">적용 전/후 변화만 표시됩니다</div>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                이동 <span className="text-indigo-900">{movedWorkers.length}</span>명
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-3">
                            <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[11px] font-semibold text-slate-500">이동 작업자</div>
                                    <div className="text-[10px] text-slate-400">FROM → TO</div>
                                </div>
                                {movedWorkers.length === 0 ? (
                                    <div className="text-xs text-slate-400 py-2">이동 없음</div>
                                ) : (
                                    <div className="space-y-2 max-h-72 md:max-h-96 overflow-y-auto pr-1">
                                        {movedWorkers.map((m) => (
                                            <div key={m.workerId} className="flex items-center justify-between text-xs bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-800 truncate">{m.name ?? `#${m.workerId}`}</div>
                                                    <div className="text-[11px] text-slate-400">ID {m.workerId}</div>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                                                        {zoneNameById.get(m.fromZoneId) ?? `Zone ${m.fromZoneId}`}
                                                    </span>
                                                    <span className="text-slate-300">→</span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                                                        {zoneNameById.get(m.toZoneId) ?? `Zone ${m.toZoneId}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3 bg-white">
                                <div className="text-[11px] font-semibold text-slate-500 mb-2">상태/인원/예상 완료</div>
                                <div className="space-y-2">
                                    {zoneStatusChanges.map((z) => (
                                        <div key={z.zoneId} className="rounded-lg border border-slate-100 px-2.5 py-2 text-xs bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold text-slate-800">{z.name}</div>
                                                <div className="text-[11px] text-slate-400 font-semibold">
                                                    {z.beforeStatus} → {z.afterStatus}
                                                </div>
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-600">
                                                <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-100">
                                                    인원 {z.beforeCount} → {z.afterCount}
                                                </span>
                                                {(() => {
                                                    const eta = getEtaInfo(z.zoneId);
                                                    if (!eta.hasData) {
                                                        return (
                                                            <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-100 text-slate-500 col-span-3 md:col-span-3">
                                                                {eta.gapText}
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <>
                                                            <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                                                                {eta.deadlineText}
                                                            </span>
                                                            <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-100">
                                                                {eta.etaText}
                                                            </span>
                                                            <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full border ${eta.gapTone}`}>
                                                                {eta.gapText}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 className="animate-spin" size={48} />
                            <p>AI 분석 중...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 h-full min-w-[1000px] lg:min-w-0">
                            {simulatedZoneStats.map((stat) => {
                                const style = getZoneStyle(stat.status);
                                return (
                                    <div key={stat.zoneId} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                                            <span className="text-xs font-bold text-slate-700">{stat.name}</span>
                                            {style.hasBadge && (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                                                    {style.badgeIcon}
                                                    {style.badgeLabel}
                                                </span>
                                            )}
                                        </div>
                                        <ManageZoneColumn
                                            zoneId={stat.zoneId}
                                            zoneName={stat.name}
                                            workers={simulatedWorkers.filter((w) => w.currentZoneId === stat.zoneId)}
                                            onDrop={handleDrop}
                                            highlightWorkerIds={simulatedWorkers
                                                .filter((sim) => {
                                                    const orig = currentWorkers.find((c) => c.userId === sim.userId);
                                                    return orig && orig.currentZoneId !== sim.currentZoneId;
                                                })
                                                .map((w) => w.userId)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t flex justify-end gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 h-9 px-4 transition-all"
                    >
                        취소
                    </Button>
                    <Button
                        className="bg-[#304FFF] hover:bg-[#304FFF]/90 text-white gap-2 px-6 h-9 rounded-full shadow-lg shadow-indigo-500/20 font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                        onClick={() => onApply(simulatedWorkers, recommendation?.moves)}
                        disabled={isLoading}
                    >
                        <Wand2 size={16} className="text-white/90" />
                        AI 추천 재배치 적용하기
                    </Button>
                </div>
            </Card>
        </div>
    );
}
