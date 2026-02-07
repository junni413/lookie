import { useEffect, useState } from "react";
import { X, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DB_Worker, ZoneStat } from "@/types/db";
import ManageZoneColumn from "./ManageZoneColumn";
import { rebalanceService } from "@/services/rebalance.api";

interface AiReallocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (workers: DB_Worker[], moves?: any[]) => void;
    currentWorkers: DB_Worker[];
    zoneStats: ZoneStat[]; // To get zone names/ids
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
    const [recommendation, setRecommendation] = useState<any>(null); // Store full recommendation

    // Initialize simulation with Real AI when modal opens
    useEffect(() => {
        const fetchRecommendation = async () => {
            if (!isOpen) return;

            setIsLoading(true);
            try {
                // Fetch AI Recommendation
                const data = await rebalanceService.recommend();
                console.log("[AiModal] Received Recommendation:", data);
                setRecommendation(data);

                if (data && data.moves) {
                    // Apply moves to create simulated state
                    const newWorkers = currentWorkers.map(worker => {
                        const move = data.moves.find((m: any) => m.worker_id === worker.userId);
                        if (move) {
                            // Apply move (change zone)
                            return { ...worker, currentZoneId: move.to_zone };
                        }
                        // Keep current zone if no move suggested
                        return worker;
                    });
                    setSimulatedWorkers(newWorkers);
                } else {
                    // No recommendation or empty? Keep as is.
                    setSimulatedWorkers(currentWorkers);
                }
            } catch (err) {
                console.error("AI Rebalance Failed", err);
                // On error, fallback to current state (safe)
                setSimulatedWorkers(currentWorkers);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendation();
    }, [isOpen, currentWorkers]);

    const handleDrop = (workerId: number, targetZoneId: number) => {
        setSimulatedWorkers(prev => prev.map(w => {
            if (w.userId === workerId) {
                return { ...w, currentZoneId: targetZoneId };
            }
            return w;
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-6 h-[85vh] max-h-[52rem] flex flex-col overflow-hidden border-0 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white shrink-0 border-b border-slate-100">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary mr-3 shadow-sm border border-primary-soft">
                            {isLoading ? <Loader2 className="animate-spin" size={20} strokeWidth={2.5} /> : <Wand2 size={20} strokeWidth={2.5} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">AI 추천 재배치</h2>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                {isLoading ? "AI가 최적의 배치를 분석하고 있습니다..." : "AI가 제안한 배치를 확인하고 수정할 수 있습니다."}
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

                {/* Simulation Area */}
                <div className="flex-1 overflow-x-auto p-4 bg-slate-100/50">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 className="animate-spin" size={48} />
                            <p>AI 분석 중...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 h-full min-w-[1000px] lg:min-w-0">
                            {zoneStats.map(stat => (
                                <ManageZoneColumn
                                    key={stat.zoneId}
                                    zoneId={stat.zoneId}
                                    zoneName={stat.name}
                                    // Pass specific subset of simulated workers
                                    workers={simulatedWorkers.filter(w => w.currentZoneId === stat.zoneId)}
                                    // Disable drop while loading or if wanted
                                    onDrop={handleDrop}
                                    highlightWorkerIds={simulatedWorkers
                                        .filter(sim => {
                                            const orig = currentWorkers.find(c => c.userId === sim.userId);
                                            // Highlight if zone changed
                                            return orig && orig.currentZoneId !== sim.currentZoneId;
                                        })
                                        .map(w => w.userId)
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
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
