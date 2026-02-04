import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { MobileLayoutContext } from "@/components/layout/MobileLayout";
import { issueService, type IssueDetail as IssueDetailType } from "@/services/issueService";
import { MapPin, Package, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";

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
                const res = await issueService.getIssue(issueId);
                if (res.success && res.data) {
                    setIssue(res.data);
                } else {
                    console.error("Failed to load issue:", res.message);
                }
            } catch (err) {
                console.error("Error loading issue:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIssue();
    }, [state, navigate]);

    if (loading) {
        return <div className="flex justify-center items-center h-full text-gray-400">Loading details...</div>;
    }

    if (!issue) return <div className="text-center py-10">이슈 정보를 찾을 수 없습니다.</div>;

    const isDone = issue.status === "RESOLVED" || issue.status === "DONE";

    return (
        <div className="flex flex-col h-full space-y-6 pb-10">
            {/* Header Status Card */}
            <div className={`rounded-3xl p-6 flex items-center justify-between border transition-all ${isDone ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                    {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    ) : (
                        <Clock className="w-6 h-6 text-orange-500" />
                    )}
                    <div>
                        <p className={`text-sm font-bold ${isDone ? 'text-blue-600' : 'text-gray-500'}`}>
                            {isDone ? "처리 완료" : "대기 중"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">#{issue.issueId}</p>
                    </div>
                </div>
                <div className="text-right text-[11px] font-bold text-gray-400">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : ""}
                </div>
            </div>

            {/* Product & Issue Info */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-gray-900 truncate">{issue.productName || "상품명 없음"}</h3>
                        <p className="text-sm font-medium text-gray-400 mt-0.5 tracking-tight">{issue.sku || "-"}</p>
                        <div className="flex items-center gap-1.5 mt-2 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg w-fit">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{issue.locationCode || issue.locationCode || "-"}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-400">신고 유형</span>
                        <span className="text-sm font-black text-gray-900">{issue.type || issue.issueType}</span>
                    </div>
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
                        {issue.aiResult && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400">재고 분석 상태</p>
                                <div className="text-[17px] font-black text-blue-600">
                                    {issue.aiResult === "MISSING" && "재고 없음 (결손 처리)"}
                                    {issue.aiResult === "WAIT" && "원복 대기 (재고 보충 예정)"}
                                    {issue.aiResult === "ADMIN" && "관리자 개입 필요"}
                                    {issue.aiResult === "LOCATION_MOVE" && "지번 이동 확인"}
                                    {!["MISSING", "WAIT", "ADMIN", "LOCATION_MOVE"].includes(issue.aiResult) && issue.aiResult}
                                </div>
                            </div>
                        )}
                        {issue.verdict && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400">파손 판정 결과</p>
                                <div className={`text-[17px] font-black ${issue.verdict === 'DAMAGED' ? 'text-red-500' : 'text-blue-600'}`}>
                                    {issue.verdict === "OK" && "정상 (파손 아님)"}
                                    {issue.verdict === "DAMAGED" && "파손 확인 (관리자 검토)"}
                                    {issue.verdict === "NEED_REVIEW" && "판단 불가 (수동 확인 필요)"}
                                    {!["OK", "DAMAGED", "NEED_REVIEW"].includes(issue.verdict) && issue.verdict}
                                </div>
                            </div>
                        )}
                        {issue.confidence && (
                            <p className="text-xs text-gray-400 mt-2">신뢰도: {(issue.confidence * 100).toFixed(1)}%</p>
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
