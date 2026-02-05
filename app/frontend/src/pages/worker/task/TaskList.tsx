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
                <div className="flex items-center justify-between px-2 pt-2">
                    <h2 className="text-[20px] font-black text-gray-900 leading-tight">
                        아래 물건들을 담아주세요.
                    </h2>
                </div>

                <div className="space-y-3 px-2">
                    {items.map((item) => (
                        <div
                            key={item.batchTaskItemId}
                            className={`rounded-3xl border p-4 flex items-center gap-4 transition-all ${item.status === 'DONE' ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'
                                }`}
                        >
                            {/* Product Image */}
                            <div className="h-20 w-20 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden">
                                {item.productImage ? (
                                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        No Image
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-[16px] text-gray-900 truncate">
                                    {item.productName}
                                </div>
                                <div className="text-[12px] font-semibold text-gray-400 mt-0.5">
                                    {item.barcode}
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-[12px] font-bold">
                                    <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">수량: <span className="text-blue-600 ml-0.5">{item.requiredQty}개</span></span>
                                    <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">지번: <span className="text-blue-600 ml-0.5">{item.locationCode}</span></span>
                                </div>
                            </div>

                            {item.status === 'DONE' && (
                                <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">
                                    준비 완료
                                </div>
                            )}
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="py-20 text-center text-gray-400 font-medium">
                            표시할 상품이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="px-2 pb-6 pt-4 bg-white border-t border-gray-50">
                {remainingCount > 0 && (
                    <div className="text-center mb-4">
                        <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[12px] font-bold">
                            남은 작업 <span className="ml-1 text-orange-700">{remainingCount}개</span>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/worker/task/work-detail", {
                        state: { task, toteBarcode }
                    })}
                    className="w-full h-14 bg-blue-600 text-white font-black text-base rounded-[20px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
                >
                    작업 계속하기
                </button>
            </div>
        </div>
    );
}
