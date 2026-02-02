import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";
import { taskService } from "@/services/taskService";
import type { TaskItemVO, TaskVO } from "@/types/task";

export default function TaskList() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const navigate = useNavigate();
    const { state } = useLocation();

    const task: TaskVO | undefined = state?.task;
    const toteBarcode = state?.toteBarcode as string | undefined;

    const [items, setItems] = useState<TaskItemVO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => setTitle(""), [setTitle]);

    useEffect(() => {
        if (!task) {
            // 작업 정보가 없으면 홈으로 보냄 (보통 작업 디테일에서 넘어옴)
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
        <div className="flex flex-col h-full px-2">
            <div className="flex-1 space-y-4 pb-8">
                <h2 className="text-[22px] font-black text-gray-900 px-1 leading-tight">
                    아래 물건들을 담아주세요.
                </h2>

                <div className="space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.batchTaskItemId}
                            className={`rounded-3xl border p-5 flex items-center gap-5 transition-all ${item.status === 'DONE' ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'
                                }`}
                        >
                            {/* Product Image Placeholder */}
                            <div className="h-20 w-20 rounded-2xl bg-gray-50 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-[17px] text-gray-900 truncate">
                                    {item.productName}
                                </div>
                                <div className="text-sm font-medium text-gray-400 mt-1">
                                    {item.barcode}
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-[13px] font-bold">
                                    <span className="text-gray-400">수량 : <span className="text-blue-600 ml-1">{item.requiredQty}개</span></span>
                                    <span className="text-gray-400">지번 : <span className="text-blue-600 ml-1">{item.locationCode}</span></span>
                                </div>
                            </div>

                            {item.status === 'DONE' && (
                                <div className="bg-green-50 text-green-600 text-[11px] font-black px-2 py-1 rounded-lg">
                                    완료
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="mt-auto px-1 pb-6 text-center">
                {remainingCount > 0 && (
                    <div className="inline-block px-5 py-2 bg-orange-50 text-orange-600 rounded-full text-[13px] font-black mb-5">
                        남은 작업 <span className="ml-1 text-orange-700">{remainingCount}개</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/worker/task/work-detail", {
                        state: { task, toteBarcode }
                    })}
                    className="w-full h-16 bg-blue-600 text-white font-black text-lg rounded-[24px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
                >
                    작업 계속하기
                </button>
            </div>
        </div>
    );
}
