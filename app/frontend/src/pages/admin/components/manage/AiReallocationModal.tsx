import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DB_Worker, ZoneStat } from "@/types/db";
import ManageZoneColumn from "./ManageZoneColumn";

interface AiReallocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (workers: DB_Worker[]) => void;
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

    // Initialize simulation when modal opens
    useEffect(() => {
        if (isOpen) {
            // Mock AI: Randomly shuffle simple for demo
            // In real app, fetch "AI proposed" state from API
            const scrambled = currentWorkers.map(w => ({
                ...w,
                currentZoneId: (Math.floor(Math.random() * 4) + 1)
            }));
            setSimulatedWorkers(scrambled);
        }
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

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden bg-slate-50 border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Wand2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">AI 추천 재배치</h2>
                            <p className="text-sm text-slate-500">AI가 제안한 배치를 확인하고 수정할 수 있습니다.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                {/* Simulation Area */}
                <div className="flex-1 overflow-x-auto p-6 bg-slate-100/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-w-[1000px] lg:min-w-0">
                        {zoneStats.map(stat => (
                            <ManageZoneColumn
                                key={stat.zoneId}
                                zoneId={stat.zoneId}
                                zoneName={stat.name}
                                // Pass specific subset of simulated workers
                                workers={simulatedWorkers.filter(w => w.currentZoneId === stat.zoneId)}
                                onDrop={handleDrop}
                                highlightWorkerIds={simulatedWorkers
                                    .filter(sim => {
                                        const orig = currentWorkers.find(c => c.userId === sim.userId);
                                        // Highlight if zone changed AND not unassigned (optional check)
                                        return orig && orig.currentZoneId !== sim.currentZoneId;
                                    })
                                    .map(w => w.userId)
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white gap-2 px-6"
                        onClick={() => onApply(simulatedWorkers)}
                    >
                        <Wand2 size={16} />
                        AI 추천 재배치 적용하기
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
}
