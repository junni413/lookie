import { useState } from "react";
import { issueService } from "@/services/issueService";
import { type IssueResponse } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/utils/format";
import { X } from "lucide-react";

interface IssueDetailProps {
    issue: IssueResponse | null;
    onUpdate: () => void;
    onClose?: () => void;
}

export default function IssueDetail({ issue, onUpdate, onClose }: IssueDetailProps) {
    const [loading, setLoading] = useState(false);

    const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
        if (!issue) return;
        if (confirm(decision === "APPROVED" ? "정상 처리 하시겠습니까?" : "폐기 처리 하시겠습니까?")) {
            setLoading(true);
            try {
                await issueService.processIssue(issue.issueId, decision);
                onUpdate(); // 목록 갱신 요청
            } catch (e) {
                console.error(e);
                alert("처리에 실패했습니다.");
            } finally {
                setLoading(false);
            }
        }
    };

    if (!issue) return <div className="text-center text-muted-foreground p-10 h-full flex items-center justify-center border rounded-xl border-dashed">선택된 이슈가 없습니다.</div>;

    const isResolved = issue.status === "RESOLVED";

    // Image handling
    const mainImage = issue.images && issue.images.length > 0 ? issue.images[0].imageUrl : null;

    const getResolvedText = () => {
        if (issue.requiredAction === "WORKER_CONTINUE") return "✅ 정상 처리됨";
        if (issue.requiredAction === "AUTO_RESOLVED") return "🗑️ 폐기 처리됨";
        return "✔️ 처리 완료됨";
    };

    return (
        <Card className="h-full border-l-0 rounded-l-none shadow-none md:border-l md:rounded-l-xl md:shadow-sm flex flex-col overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b bg-card z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold">{issue.zoneName} 이슈</h2>
                            {isResolved && <Badge variant="secondary">완료</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            작업자: <span className="font-medium text-foreground">{issue.workerName}</span> • {timeAgo(issue.createdAt)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={issue.issueType === "OUT_OF_STOCK" ? "destructive" : "default"}>
                            {issue.issueType === "OUT_OF_STOCK" ? "재고 부족" : "파손 감지"}
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
                            <div className="flex items-center justify-center h-full text-muted-foreground">이미지 없음</div>
                        )}

                        {/* Overlay info */}
                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm font-medium">
                            우선순위: {issue.priority}
                        </div>
                    </div>

                    {/* AI Analysis (Optional Placeholder) */}
                    {issue.judgment && (
                        <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="text-sm font-semibold text-blue-800 mb-1">AI 분석 결과</div>
                            <div className="text-sm text-blue-600">
                                {issue.judgment.summary || "특이사항 없음"} (신뢰도: {(issue.judgment.confidence || 0) * 100}%)
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
                                    처리 일시: {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString() : "-"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {issue.issueType === "DAMAGED" && (
                                    <div className="flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                                        ⚠️ 상품 파손이 감지되었습니다
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        size="lg"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        onClick={() => handleDecision("APPROVED")}
                                        disabled={loading}
                                    >
                                        정상
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        className="w-full shadow-sm"
                                        onClick={() => handleDecision("REJECTED")}
                                        disabled={loading}
                                    >
                                        폐기
                                    </Button>
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
