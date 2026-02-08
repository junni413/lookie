import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import type { TaskItemVO, TaskVO } from "@/types/task";
import { Hash, Package, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

export default function TaskList() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const navigate = useNavigate();
    const { state } = useLocation();

    const task: TaskVO | undefined = state?.task;
    const toteBarcode = state?.toteBarcode as string | undefined;

    const [items, setItems] = useState<TaskItemVO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTitle("상품 목록");
    }, [setTitle]);

    useEffect(() => {
        if (!task) {
            // 작업 정보가 없으면 홈으로 보냄
            navigate("/worker/home", { replace: true });
            return;
        }

        const fetchItems = async () => {
            try {
                const response = await taskService.getTaskItems(task.batchTaskId);
                if (response.success) {
                    setItems(response.data);
                }
            } catch (err) {
                console.error("Fetch task list error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [task, navigate]);

    if (loading) return null;

    // 완료되지 않은 작업 수 계산
    const remainingCount = items.filter(it => it.status !== 'DONE').length;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex-1 space-y-4 pb-8 overflow-y-auto">
                <div className="flex items-center justify-between px-4 pt-6 pb-2">
                    <h2 className="text-[23px] font-black text-slate-900 leading-tight tracking-tight">
                        아래 물건들을<br />담아주세요.
                    </h2>
                </div>

                <div className="space-y-4 px-4 pb-12">
                    <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                key={item.batchTaskItemId}
                                className={`h-[120px] rounded-[24px] border px-4 flex items-center gap-4 transition-all duration-300 ${item.status === 'DONE'
                                    ? 'bg-slate-50/50 border-slate-100 opacity-60' :
                                    item.status === 'ISSUE_PENDING'
                                        ? 'bg-amber-50/30 border-amber-100/50' :
                                        item.status === 'IN_PROGRESS'
                                            ? 'bg-blue-50/30 border-blue-100 shadow-[0_4px_15px_-5px_rgba(37,99,235,0.1)]' :
                                            'bg-white border-slate-100 shadow-[0_4px_12px_-5px_rgba(30,41,59,0.08)]'
                                    }`}
                            >
                                {/* Product Image */}
                                <div className="h-20 w-20 rounded-2xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100/50 p-1">
                                    {item.productImage ? (
                                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <Package className="w-6 h-6" strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-[17px] text-slate-900 truncate tracking-tight">
                                        {item.productName}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-0.5">
                                        <Hash className="w-3 h-3" />
                                        <span>{item.barcode}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100/60 text-slate-500 rounded-md text-[10px] font-black">
                                            <Package className="w-2.5 h-2.5 text-slate-400" />
                                            <span><span className="text-blue-600">{item.requiredQty}</span>개</span>
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100/60 text-slate-500 rounded-md text-[10px] font-black">
                                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                            <span><span className="text-blue-600">{item.locationCode}</span></span>
                                        </div>

                                        {/* 상태 라벨 표시 */}
                                        {item.status === 'DONE' && (
                                            <div className="px-2 py-0.5 bg-emerald-100/80 text-emerald-700 rounded-md text-[10px] font-black">
                                                {item.adminDecision === 'DAMAGED' ? '완료 (파손 확정)' :
                                                    item.adminDecision === 'OUT_OF_STOCK' ? '완료 (결품 확정)' : '완료'}
                                            </div>
                                        )}
                                        {item.status === 'ISSUE_PENDING' && (
                                            <div className="px-2 py-0.5 bg-amber-100/80 text-amber-700 rounded-md text-[10px] font-black tabular-nums">
                                                신고됨 (패스)
                                            </div>
                                        )}
                                        {item.status === 'IN_PROGRESS' && (
                                            <div className="px-2 py-0.5 bg-blue-100/80 text-blue-700 rounded-md text-[10px] font-black animate-pulse">
                                                집품 중
                                            </div>
                                        )}
                                        {item.status === 'PENDING' && (
                                            <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">
                                                대기 중
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    {item.status === 'DONE' && (
                                        <div className="bg-emerald-50 text-emerald-500 p-2 rounded-xl border border-emerald-100">
                                            <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
                                        </div>
                                    )}
                                    {item.status === 'ISSUE_PENDING' && (
                                        <div className="bg-amber-50 text-amber-500 p-2 rounded-xl border border-amber-100">
                                            <AlertCircle className="w-5 h-5" strokeWidth={3} />
                                        </div>
                                    )}
                                    {item.status === 'IN_PROGRESS' && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping mr-2" />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {items.length === 0 && (
                        <div className="py-24 text-center">
                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">표시할 상품이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="px-5 pb-8 pt-4 bg-white border-t border-slate-50">
                {remainingCount > 0 && (
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-50 text-amber-600 rounded-full text-[13px] font-black border border-amber-100/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            남은 작업 <span className="ml-0.5 text-amber-700">{remainingCount}건</span>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/worker/task/work-detail", {
                        state: { task, toteBarcode }
                    })}
                    className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-[17px] rounded-[22px] shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span>작업 계속하기</span>
                </button>
            </div>
        </div>
    );
}
