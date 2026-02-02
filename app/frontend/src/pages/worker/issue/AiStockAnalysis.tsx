import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { ChevronRight, MapPin, Loader2 } from "lucide-react";
import { taskService } from "@/services/taskService";

type AnalysisResult = "MISSING" | "WAIT" | "ADMIN" | "LOCATION_MOVE";

type NavState = {
    product: { productName: string; barcode: string; locationCode: string };
};

export default function AiStockAnalysis() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const nav = useLocation().state as NavState | undefined;
    const navigate = useNavigate();

    const [step, setStep] = useState<"REQUEST" | "LOADING" | "RESULT">("REQUEST");
    const [result, setResult] = useState<AnalysisResult>("MISSING");

    useEffect(() => {
        if (!nav) navigate("/worker/home", { replace: true });
    }, [nav, navigate]);

    useEffect(() => {
        setTitle(""); // Header title hidden like in image
    }, [setTitle]);

    const handleAiRequest = async () => {
        setStep("LOADING");

        let issueId = "";
        // 통계 업데이트 및 초기 이슈 생성
        if (nav?.product) {
            issueId = await taskService.reportIssue({
                productName: nav.product.productName,
                sku: nav.product.barcode,
                location: nav.product.locationCode,
                type: "재고없음"
            });
        } else {
            issueId = await taskService.reportIssue();
        }

        // Simulate AI Analysis delay
        setTimeout(async () => {
            const results: AnalysisResult[] = ["MISSING", "WAIT", "ADMIN", "LOCATION_MOVE"];
            const randomResult = results[Math.floor(Math.random() * results.length)];

            // 결과 업데이트 (지번 이동 등이면 상태도 바뀔 수 있음)
            await taskService.updateIssueResult(issueId, {
                aiResult: randomResult,
                status: randomResult === "MISSING" ? "WAIT" : "DONE" // 예시 로직
            });

            setResult(randomResult);
            setStep("RESULT");
        }, 2000);
    };

    if (step === "LOADING") {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 pt-20">
                <div className="relative">
                    <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-600">AI</div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[22px] font-black text-gray-900">전산 상태 분석 중</p>
                    <p className="text-sm font-medium text-gray-400">데이터를 대조하여 최적의 조치를<br />찾고 있습니다.</p>
                </div>
            </div>
        );
    }

    if (step === "RESULT") {
        return <RenderResult result={result} />;
    }

    return (
        <div className="flex flex-col h-full space-y-12 px-2">
            {/* Header Info */}
            <div className="space-y-4 pt-4 px-1">
                <h2 className="text-[28px] font-black text-gray-900 leading-tight">
                    재고 없음 신고
                </h2>
                <p className="text-base font-medium text-gray-500 leading-relaxed">
                    AI가 현재 전산 상황을 분석하여<br />
                    다음 조치를 안내해드립니다.
                </p>
            </div>

            {/* Large AI Request Button */}
            <div className="flex-1 flex items-center justify-center pb-20">
                <button
                    onClick={handleAiRequest}
                    className="w-[200px] h-[180px] rounded-[40px] bg-blue-600 shadow-2xl shadow-blue-100 flex flex-col items-center justify-center gap-6 active:scale-95 transition-all"
                >
                    <span className="text-[20px] font-black text-white">AI 분석 요청</span>
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <ChevronRight className="w-7 h-7 text-white" />
                    </div>
                </button>
            </div>
        </div>
    );
}

function RenderResult({ result }: { result: AnalysisResult }) {
    const navigate = useNavigate();
    const [adminConnected, setAdminConnected] = useState(false);

    const getContent = () => {
        switch (result) {
            case "MISSING":
                return {
                    title: "재고 없음",
                    desc: "해당 제품은 결손 상태로 확인됩니다.\n작업을 이어서 진행하세요.",
                };
            case "WAIT":
                return {
                    title: "원복 대기",
                    desc: "상품의 재고가 곧 채워질 예정입니다.\n다른 작업을 먼저 진행해주세요.",
                };
            case "ADMIN":
                return {
                    title: "관리자 연결",
                    desc: "해당 문제는 관리자의 검토가 필요합니다.\n관리자에게 연결하세요.",
                };
            case "LOCATION_MOVE":
                return {
                    title: "지번 이동",
                    desc: "해당 상품은 지번이 이동되었습니다.\n아래 지번으로 이동하여 작업을 진행하세요.",
                };
        }
    };

    const content = getContent();

    const handleConnectAdmin = () => {
        alert("관리자에게 연결합니다.");
        setAdminConnected(true);
    };

    // 관리자 연결이 필수인 경우 (ADMIN 결과)
    const isNextDisabled = result === "ADMIN" && !adminConnected;

    return (
        <div className="flex flex-col h-full space-y-6 px-2">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <h2 className="text-[32px] font-black text-gray-900">{content.title}</h2>
                <p className="text-[17px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">
                    {content.desc}
                </p>

                {result === "LOCATION_MOVE" && (
                    <div className="mt-10 group w-full max-w-[200px] rounded-[32px] border-2 border-blue-50 bg-white p-7 shadow-sm flex flex-col items-center gap-4">
                        <div className="p-3.5 rounded-full bg-blue-600 text-white">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900">지번 스캔</p>
                            <p className="text-[15px] font-bold text-blue-600 mt-1">A-12-03</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto pb-6 space-y-3.5">
                <button
                    className={`w-full h-16 rounded-[24px] font-black text-[17px] transition-all ${adminConnected
                        ? "bg-gray-100 text-gray-400"
                        : "bg-slate-50 text-blue-600 active:scale-[0.98]"
                        }`}
                    onClick={handleConnectAdmin}
                    disabled={adminConnected}
                >
                    {adminConnected ? "관리자 연결됨" : "관리자 연결하기"}
                </button>
                <button
                    onClick={() => navigate(-1)}
                    disabled={isNextDisabled}
                    className={`w-full h-16 rounded-[24px] font-black text-[17px] transition-all shadow-lg ${isNextDisabled
                        ? "bg-gray-200 text-gray-400 shadow-none"
                        : "bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]"
                        }`}
                >
                    다음 작업 진행
                </button>
            </div>
        </div>
    );
}
