import { useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import type { MobileLayoutContext } from "../../../components/layout/MobileLayout";

type TaskItem = {
    id: string;
    name: string;
    sku: string;
    qty: number;
    location: string;
    isDone: boolean;
};

// Mock Data from Image
const MOCK_TASKS: TaskItem[] = [
    {
        id: "1",
        name: "삼성 블루투스 이어폰",
        sku: "SKU-887421-KR",
        qty: 2,
        location: "A-12-03",
        isDone: false,
    },
    {
        id: "2",
        name: "삼성 블루투스 이어폰",
        sku: "SKU-887421-KR",
        qty: 2,
        location: "A-12-03",
        isDone: false,
    },
    {
        id: "3",
        name: "삼성 블루투스 이어폰",
        sku: "SKU-887421-KR",
        qty: 2,
        location: "A-12-03",
        isDone: false,
    },
];

export default function TaskList() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const navigate = useNavigate();

    useEffect(() => setTitle(""), [setTitle]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 pb-8">
                <h2 className="text-lg font-bold text-gray-900 px-1">
                    아래 물건들을 담아주세요.
                </h2>

                <div className="space-y-3">
                    {MOCK_TASKS.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-4"
                        >
                            {/* Product Image Placeholder */}
                            <div className="h-16 w-16 rounded-xl bg-gray-100 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 truncate">
                                    {item.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                    {item.sku}
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                    <span className="text-gray-500">수량 : <span className="font-semibold text-blue-600">{item.qty}개</span></span>
                                    <span className="text-gray-500">지번 : <span className="font-semibold text-blue-600">{item.location}</span></span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="mt-auto px-1 pb-4 text-center">
                <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold mb-4">
                    남은 작업 <span className="ml-1 text-orange-700">2개</span>
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/worker/task/work-detail", {
                        state: {
                            task: { zone: "A-2", line: "L-05", count: 24 }, // Mock context
                            toteBarcode: "MOCK-TOTE"
                        }
                    })}
                    className="w-full h-14 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.99] transition-transform"
                >
                    작업 완료
                </button>
            </div>
        </div>
    );
}
