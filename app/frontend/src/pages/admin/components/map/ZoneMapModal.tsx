import type { DB_Worker, ZoneLayout } from "@/types/db";
import { X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import ZoneMap from "./ZoneMap";
import { useEffect } from "react";

interface ZoneMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    zoneName: string;
    layout: ZoneLayout | null;
    workers: DB_Worker[];
}

export default function ZoneMapModal({
    isOpen,
    onClose,
    zoneName,
    layout,
    workers,
}: ZoneMapModalProps) {
    // ESC key handler
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Modal Container */}
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-6 h-[85vh] max-h-[52rem] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white shrink-0 border-b border-slate-100">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary mr-3 shadow-sm border border-primary-soft">
                            <Layers size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                {zoneName.toUpperCase()}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                공간 구조 및 실시간 작업자 배치 현황
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

                {/* Legend & Content Wrapper */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">


                    {/* Zone Map Content */}
                    <div className="flex-1 overflow-hidden relative">
                        <ZoneMap layout={layout} workers={workers} />
                    </div>

                    <div className="text-right px-6 pb-2 pt-0 text-[11px] text-slate-400 font-medium">
                        * 점 하나는 작업자 1명을 나타냅니다
                    </div>
                </div>
            </div>
        </div>
    );
}
