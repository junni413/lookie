import { useState, useEffect } from "react";
import { adminService } from "@/services/adminService";
import type { IssueDetailData } from "@/types/issue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface IssueDetailProps {
    issueId: number;
    onUpdate: () => void;
    onClose?: () => void;
}

export default function IssueDetail({ issueId, onUpdate, onClose }: IssueDetailProps) {
    const [issue, setIssue] = useState<IssueDetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        let ignore = false;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const data = await adminService.getIssueDetail(issueId);
                if (!ignore) {
                    setIssue(data);
                }
            } catch (err) {
                if (!ignore) console.error(err);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        if (issueId) fetchDetail();

        return () => {
            ignore = true;
        };
    }, [issueId]);

    const handleDecision = async (decision: "NORMAL" | "DAMAGED" | "CALLED_OTHER_PROCESS" | "FIXED") => {
        if (!issue) return;
        if (confirm("확정 하시겠습니까?")) {
            setProcessing(true);
            try {
                await adminService.confirmIssue(issue.issueId, decision);
                onUpdate(); // 목록 갱신 요청
            } catch (e) {
                console.error(e);
                alert("처리에 실패했습니다.");
            } finally {
                setProcessing(false);
            }
        }
    };

    if (loading) return <div className="text-center p-10 text-muted-foreground">로딩 중...</div>;
    if (!issue) return <div className="text-center text-muted-foreground p-10 h-full flex items-center justify-center border rounded-xl border-dashed">선택된 이슈가 없습니다.</div>;

    const isResolved = issue.status === "RESOLVED";

    // Image handling
    const mainImage = issue.imageUrls && issue.imageUrls.length > 0 ? issue.imageUrls[0] : null;

    const getResolvedText = () => {
        if (issue.adminDecision) return `✅ ${issue.adminDecision}`;
        return "✔️ 처리 완료됨";
    };

    return (
        <Card className="h-full border-l-0 rounded-l-none shadow-none md:border-l md:rounded-l-xl md:shadow-sm flex flex-col overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b bg-card z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold">이슈 상세</h2>
                            {isResolved && <Badge variant="secondary">완료</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            ID: {issue.issueId} • 유형: {issue.type}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={issue.type === "OUT_OF_STOCK" ? "destructive" : "default"}>
                            {issue.type === "OUT_OF_STOCK" ? "재고 부족" : "파손 감지"}
                        </Badge>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 ml-2">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Image Area */}
                    <div className="relative aspect-video w-full bg-muted rounded-xl overflow-hidden mb-6 group shadow-sm border">
                        {mainImage ? (
                            <img src={mainImage} alt="Issue Issue" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
                                <span>이미지 없음</span>
                                <span className="text-xs text-gray-400">(백엔드 API 미지원)</span>
                            </div>
                        )}

                        {/* Overlay info */}
                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm font-medium">
                            긴급도: {issue.urgency}
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {issue.aiResult && (
                        <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="text-sm font-semibold text-blue-800 mb-1">AI 분석 결과 ({issue.aiResult})</div>
                            <div className="text-sm text-blue-600">
                                {issue.summary || "특이사항 없음"} (신뢰도: {(issue.confidence || 0) * 100}%)
                            </div>
                        </div>
                    )}

                    {/* Status & Actions */}
                    <div className="mt-auto space-y-4">
                        {isResolved ? (
                            <div className="text-center p-8 bg-muted/40 rounded-xl">
                                <div className="text-xl font-bold mb-2">
                                    {getResolvedText()}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {/* Resolved Date can be added if available in detail data */}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {issue.type === "DAMAGED" && (
                                    <div className="flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                                        ⚠️ 상품 파손이 감지되었습니다
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        size="lg"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        onClick={() => handleDecision("NORMAL")}
                                        disabled={processing}
                                    >
                                        정상 (Normal)
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        className="w-full shadow-sm"
                                        onClick={() => handleDecision(issue.type === "DAMAGED" ? "DAMAGED" : "FIXED")}
                                        disabled={processing}
                                    >
                                        {issue.type === "DAMAGED" ? "파손 확정" : "조치 완료"}
                                    </Button>
                                    {/* Action for CALLED_OTHER_PROCESS if needed */}
                                </div>
                            </div>
                        )}

                        <Button size="lg" variant="outline" className="w-full border-blue-200 hover:bg-blue-50 text-blue-700">
                            화상 연결 (WebRTC)
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
