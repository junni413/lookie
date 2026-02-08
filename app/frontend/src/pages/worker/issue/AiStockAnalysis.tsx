import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { ChevronRight, MapPin, Loader2 } from "lucide-react";
import { issueService } from "@/services/issueService";
import { subscribeIssueResult } from "@/services/stompService";
import { useToast } from "@/components/ui/use-toast";
import type { TaskItemVO } from "@/types/task";

type AnalysisResult = "OUT_OF_STOCK" | "WAIT" | "ADMIN" | "LOCATION_MOVE" | "ERROR";

type NavState = {
    task?: any;
    toteBarcode?: string;
    product: TaskItemVO; // TaskItemVO includes batchTaskId, batchTaskItemId
};

type AiResultData = {
    aiDecision: string;
    reasonCode?: string;
    summary?: string;
    newLocationCode?: string;
};

export default function AiStockAnalysis() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const location = useLocation();
    const nav = (location.state as NavState | undefined) || (
        // ✅ 세션 복구 1순위: localStorage fallback (React Router state 유실 대비)
        JSON.parse(localStorage.getItem("latest_issue_state") || "null") as NavState | null
    );
    const navigate = useNavigate();
    const { toast } = useToast();

    const [step, setStep] = useState<"REQUEST" | "LOADING" | "RESULT">("REQUEST");
    const [result, setResult] = useState<AnalysisResult>("OUT_OF_STOCK");
    const [aiData, setAiData] = useState<AiResultData | null>(null);

    useEffect(() => {
        if (!nav || !nav.product) {
            console.error("❌ [AiStockAnalysis] Missing navigation state");
        }
    }, [nav]);

    useEffect(() => {
        setTitle(""); // Header title hidden like in image
    }, [setTitle]);

    const handleAiRequest = async () => {
        if (!nav?.product) {
            toast({ title: "작업 정보가 없습니다.", variant: "destructive" });
            return;
        }

        setStep("LOADING");

        try {
            // 1. 이슈 생성 (OUT_OF_STOCK, 이미지 없이)
            const issueRes = await issueService.createIssue({
                taskId: nav?.product?.batchTaskId || 0,        // ✅ 백엔드는 taskId로 받음
                taskItemId: nav?.product?.batchTaskItemId || 0, // ✅ 백엔드는 taskItemId로 받음
                issueType: "OUT_OF_STOCK",
            });

            if (!issueRes.success) {
                toast({ title: "이슈 접수 실패", description: issueRes.message, variant: "destructive" });
                setStep("REQUEST");
                return;
            }

            const issueId = issueRes.data.issueId;
            console.log(`✅ [OOS] Issue created: issueId=${issueId}`);

            // 2. WebSocket으로 AI 결과 구독
            const token = localStorage.getItem("token") || "";
            let timeoutId: number | null = null;

            const unsubscribe = subscribeIssueResult(issueId, token, (event) => {
                console.log(`📨 [OOS] AI Result received:`, event);

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // AI 결과 매핑
                const aiResult: AiResultData = {
                    aiDecision: event.aiDecision || "UNKNOWN",
                    reasonCode: event.reasonCode,
                    summary: event.summary,
                    newLocationCode: event.newLocationCode,
                };

                setAiData(aiResult);
                setResult(mapAiResultToUI(aiResult));
                setStep("RESULT");

                // 구독 해제
                unsubscribe();
            });

            // 3. 타임아웃 설정 (30초)
            timeoutId = setTimeout(() => {
                console.warn("⏰ [OOS] AI Result timeout");
                unsubscribe();
                setResult("ERROR");
                setStep("RESULT");
                toast({
                    title: "AI 분석 타임아웃",
                    description: "관리자에게 문의하세요.",
                    variant: "destructive",
                });
            }, 30000);

        } catch (e) {
            console.error("❌ [OOS] Error:", e);
            toast({ title: "이슈 접수 중 오류 발생", variant: "destructive" });
            setStep("REQUEST");
        }
    };

    if (!nav || !nav.product) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-6">
                <div className="p-4 bg-amber-50 rounded-full">
                    <MapPin className="w-12 h-12 text-amber-500" />
                </div>
                <div>
                    <p className="text-xl font-black text-gray-900">분석 정보가 없습니다.</p>
                    <p className="mt-2 text-sm text-gray-400 font-medium">작업 정보를 불러올 수 없습니다.</p>
                </div>
                <button onClick={() => navigate(-1)} className="w-full max-w-[200px] h-14 bg-slate-900 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all">
                    이전으로 돌아가기
                </button>
            </div>
        );
    }

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
        return <RenderResult result={result} aiData={aiData} />;
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

/**
 * AI 결과를 UI 상태로 매핑
 */
function mapAiResultToUI(aiResult: AiResultData): AnalysisResult {
    const { aiDecision, reasonCode } = aiResult;

    // MOVE_LOCATION: 다른 지번에서 발견
    if (aiDecision === "PASS" && reasonCode === "MOVE_LOCATION") {
        return "LOCATION_MOVE";
    }

    // NEED_CHECK: 관리자 확인 필요
    if (aiDecision === "NEED_CHECK") {
        return "ADMIN";
    }

    // WAITING_RETURN: 반품 대기
    if (reasonCode === "WAITING_RETURN") {
        return "WAIT";
    }

    // DAMAGED: 파손 처리 중
    if (reasonCode === "DAMAGED") {
        return "ADMIN";
    }

    // 기본값: 재고 없음
    return "OUT_OF_STOCK";
}

function RenderResult({ result, aiData }: { result: AnalysisResult; aiData: AiResultData | null }) {
    const navigate = useNavigate();
    const [adminConnected, setAdminConnected] = useState(false);

    const getContent = () => {
        // AI 결과의 summary가 있으면 우선 사용
        if (aiData?.summary) {
            switch (result) {
                case "LOCATION_MOVE":
                    return {
                        title: "지번 이동",
                        desc: aiData.summary,
                    };
                case "ADMIN":
                    return {
                        title: "관리자 확인 필요",
                        desc: aiData.summary,
                    };
                case "WAIT":
                    return {
                        title: "원복 대기",
                        desc: aiData.summary,
                    };
                case "ERROR":
                    return {
                        title: "분석 실패",
                        desc: "AI 분석에 실패했습니다.\n관리자에게 문의하세요.",
                    };
                default:
                    return {
                        title: "재고 없음",
                        desc: aiData.summary,
                    };
            }
        }

        // Fallback: 기본 메시지
        switch (result) {
            case "OUT_OF_STOCK":
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
            case "ERROR":
                return {
                    title: "분석 실패",
                    desc: "AI 분석에 실패했습니다.\n관리자에게 문의하세요.",
                };
            default:
                return {
                    title: "분석 완료",
                    desc: "분석이 완료되었습니다.",
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

                {result === "LOCATION_MOVE" && aiData?.newLocationCode && (
                    <div className="mt-10 group w-full max-w-[200px] rounded-[32px] border-2 border-blue-50 bg-white p-7 shadow-sm flex flex-col items-center gap-4">
                        <div className="p-3.5 rounded-full bg-blue-600 text-white">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900">이동할 지번</p>
                            <p className="text-[15px] font-bold text-blue-600 mt-1">{aiData.newLocationCode}</p>
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
