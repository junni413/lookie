import { useEffect } from "react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { ChevronRight } from "lucide-react";
import { taskService } from "@/services/taskService";

type NavState = {
    product: { productName: string; barcode: string; locationCode: string };
};

export default function OtherIssue() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const nav = useLocation().state as NavState | undefined;
    const navigate = useNavigate();

    useEffect(() => {
        if (!nav) navigate("/worker/home", { replace: true });
    }, [nav, navigate]);

    useEffect(() => {
        setTitle(""); // Header title hidden like in design
    }, [setTitle]);

    const handleConnectAdmin = async () => {
        // 통계 업데이트
        if (nav?.product) {
            await taskService.reportIssue({
                productName: nav.product.productName,
                sku: nav.product.barcode,
                location: nav.product.locationCode,
                type: "기타"
            });
        } else {
            await taskService.reportIssue();
        }
        alert("관리자에게 연결합니다.");
        navigate(-1); // 또는 작업 상세로 복귀
    };

    return (
        <div className="flex flex-col h-full space-y-12 px-2">
            {/* Header Info */}
            <div className="space-y-4 pt-4 px-1">
                <h2 className="text-[28px] font-black text-gray-900 leading-tight">
                    기타 신고
                </h2>
                <p className="text-base font-medium text-gray-500 leading-relaxed">
                    관리자 연결 후 상황을 설명해 주세요.
                </p>
            </div>

            {/* Large Admin Connection Button */}
            <div className="flex-1 flex items-center justify-center pb-20">
                <button
                    onClick={handleConnectAdmin}
                    className="w-[220px] h-[200px] rounded-[40px] bg-[#3B5BFF] shadow-2xl shadow-blue-100 flex flex-col items-center justify-center gap-6 active:scale-95 transition-all text-white font-black"
                >
                    <span className="text-[20px]">관리자 연결하기</span>
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <ChevronRight className="w-7 h-7" />
                    </div>
                </button>
            </div>
        </div>
    );
}
