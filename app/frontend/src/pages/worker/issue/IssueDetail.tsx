import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { issueService, type IssueDetailData as IssueDetailType } from "@/services/issueService";
import { MapPin, Package, Calendar, AlertCircle, CheckCircle2, Clock, Hash, Loader2 } from "lucide-react";

export default function IssueDetail() {
    const { setTitle } = useOutletContext<MobileLayoutContext>();
    const navigate = useNavigate();
    const { state } = useLocation();
    const [issue, setIssue] = useState<IssueDetailType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTitle("이슈 상세 정보");
    }, [setTitle]);

    useEffect(() => {
        const fetchIssue = async () => {
            // ✅ List에서 넘어온 데이터 우선 사용
            if (state?.issue) {
                const passed = state.issue;
                console.log("Passed issue:", passed);
                setIssue({
                    ...passed,
                    // Map List fields to Detail fields
                    type: passed.issueType, // issueType -> type
                    aiResult: passed.aiDecision, // aiDecision -> aiResult
                } as any);
                setLoading(false);
                return;
            }

            // Supports both state.issueId (from list) or state.issue (legacy/direct)
            const issueId = state?.issueId || state?.issue?.id || state?.issue?.issueId;

            if (!issueId) {
                navigate("/worker/issue/list", { replace: true });
                return;
            }

            try {
                setLoading(true);
                const res = await issueService.getIssueDetail(issueId);
                if (res) {
                    setIssue(res);
                } else {
                    console.error("Failed to load issue");
                }
            } catch (err) {
                console.error("Error loading issue:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIssue();
    }, [state, navigate]);

    // ✅ Helper: issueType code -> label & style
    const getIssueTypeConfig = (type?: string) => {
        switch (type) {
            case "DAMAGED":
                return { label: "상품 파손", color: "bg-red-50 text-red-600 border-red-200" };
            case "OUT_OF_STOCK":
                return { label: "재고 없음", color: "bg-amber-50 text-amber-600 border-amber-200" };
            default:
                return { label: "알 수 없는 이슈", color: "bg-gray-50 text-gray-500 border-gray-200" };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-gray-400">이슈 상세 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (!issue) return <div className="text-center py-20 text-gray-400 font-bold">이슈 정보를 찾을 수 없습니다.</div>;

    const isDone = issue.status === "RESOLVED" || issue.status === "DONE";
    const config = getIssueTypeConfig(issue.issueType || issue.type);

    return (
        <div className="flex flex-col h-full space-y-6 pb-10 px-1">
            {/* Header: Status & Type */}
            <div className="flex flex-col gap-4">
                <div className={`rounded-[32px] p-6 flex items-center justify-between border transition-all ${isDone ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDone ? 'bg-blue-600' : 'bg-orange-500'} text-white shadow-sm`}>
                            {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className={`text-sm font-black ${isDone ? 'text-blue-600' : 'text-orange-600'}`}>
                                {isDone ? "조치 완료" : "조치 대기 중"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 font-bold text-xs">
                                <Hash className="w-3 h-3" />
                                {issue.issueId}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`rounded-2xl border p-4 flex items-center justify-between ${config.color.split(' ').slice(0, 2).join(' ')} ${config.color.split(' ')[2]}`}>
                    <span className="text-sm font-black">신고 유형</span>
                    <span className="text-sm font-black underline underline-offset-4">{config.label}</span>
                </div>
            </div>

            {/* Product & Location Info */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-slate-50 text-slate-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">상품명</p>
                            <h3 className="text-[18px] font-black text-slate-900 leading-tight mt-0.5">{issue.productName || "상품명 없음"}</h3>
                        </div>
                    </div>

                    <div className="h-px bg-gray-50" />

                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-400">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">지번 위치</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[20px] font-black text-blue-600 font-mono">{issue.locationCode || "-"}</span>
                                {issue.zoneName && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-[11px] font-black">{issue.zoneName}구역</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-50 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold">접수 일시: {issue.createdAt ? new Date(issue.createdAt).toLocaleString() : "-"}</span>
                </div>
            </div>

            {/* AI Analysis Result Section (Optional) */}
            {(issue.aiResult || issue.verdict) && (
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 px-1 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        AI 분석 결과
                    </h4>
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                        {/* 1) 판정 결과 (파손 여부 중심) */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400">분석 판정</p>
                            <div className="text-[17px] font-black">
                                {(() => {
                                    const res = issue.aiResult || issue.verdict;
                                    if (res === "FAIL" || res === "DAMAGED") {
                                        return <span className="text-red-500">❌ 파손 감지</span>;
                                    }
                                    if (res === "PASS" || res === "OK") {
                                        return <span className="text-blue-600">✅ 정상 상품</span>;
                                    }
                                    if (res === "NEED_CHECK" || res === "NEED_REVIEW") {
                                        return <span className="text-amber-500">⚠️ 애매 (관리자 확인 필요)</span>;
                                    }
                                    if (res === "RETAKE") {
                                        return <span className="text-slate-500">📸 재촬영 필요</span>;
                                    }
                                    // 2) 재고 특화 결과 (기존 로직 유지)
                                    if (res === "MISSING") return <span className="text-amber-500">재고 없음 (결손 처리)</span>;
                                    if (res === "WAIT") return <span className="text-slate-500">원복 대기 (재고 보충 예정)</span>;
                                    if (res === "ADMIN") return <span className="text-amber-500">관리자 개입 필요</span>;
                                    if (res === "LOCATION_MOVE") return <span className="text-blue-600">지번 이동 확인</span>;
                                    
                                    return <span className="text-gray-600">{res}</span>;
                                })()}
                            </div>
                        </div>

                        {issue.confidence && (
                            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                <span>분석 신뢰도</span>
                                <span className="font-bold text-gray-600">{(issue.confidence * 100).toFixed(1)}%</span>
                            </p>
                        )}
                        {issue.summary && (
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {issue.summary}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Image (Optional) */}
            {issue.imageUrl && (
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 px-1">현장 증빙 자료</h4>
                    <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm aspect-video bg-gray-50 flex items-center justify-center">
                        <img src={issue.imageUrl} alt="issue evidence" className="w-full h-full object-cover" />
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="mt-auto pt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-full h-16 bg-blue-600 text-white font-black text-lg rounded-[24px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
                >
                    목록으로 돌아가기
                </button>
            </div>
        </div>
    );
}
