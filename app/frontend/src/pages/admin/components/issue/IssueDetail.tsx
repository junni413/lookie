import { useState, useEffect } from "react";
import { issueService } from "@/services/issueService";
import type { IssueDetailData } from "@/types/issue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, X } from "lucide-react";
import { useCallStore } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

interface IssueDetailProps {
    issueId: number;
    onUpdate: () => void;
    onClose?: () => void;
    initialWorkerId?: number;
}

export default function IssueDetail({ issueId, onUpdate, onClose, initialWorkerId }: IssueDetailProps) {
    const [issue, setIssue] = useState<IssueDetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    
    // WebRTC connection
    const { startCall } = useCallStore();
    const { user } = useAuthStore();

    useEffect(() => {
        let ignore = false;
        
        // Reset state for new issue
        setSelectedImageIndex(0);
        setIssue(null);

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const data = await issueService.getIssueDetail(issueId);
                if (!ignore) {
                    setIssue(data);
                }
            } catch (err) {
                if (!ignore) console.error(err);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        if (issueId) {
            fetchDetail();
        }

        return () => {
            ignore = true;
        };
    }, [issueId]);

    const handleDecision = async (decision: "NORMAL" | "DAMAGED" | "CALLED_OTHER_PROCESS" | "FIXED") => {
        if (!issue) return;
        if (confirm("확정하시겠습니까?")) {
            setProcessing(true);
            try {
                await issueService.confirmIssue(issue.issueId, { adminDecision: decision });
                toast.success("처리가 완료되었습니다.");
                onUpdate(); // 목록 갱신 요청
            } catch (e) {
                console.error(e);
                toast.error("처리에 실패했습니다.");
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleWebRTCCall = async () => {
        const targetWorkerId = issue?.workerId || initialWorkerId;
        
        if (!targetWorkerId) {
            toast.error("작업자 정보를 확인할 수 없습니다.");
            return;
        }

        if (!user || !user.userId) {
            toast.error("로그인 정보를 확인할 수 없습니다.");
            return;
        }

        try {
            // 통화 발신 (callerId, calleeId, issueId, calleeName)
            await startCall(
                user.userId,
                targetWorkerId,
                issueId,
                issue?.workerName || "작업자"
            );
            toast.success("작업자에게 화상 통화를 발신합니다.");
        } catch (error) {
            console.error("Failed to make call", error);
            toast.error("통화 연결에 실패했습니다.");
        }
    };

    if (loading) return <div className="text-center p-10 text-muted-foreground">로딩 중...</div>;
    if (!issue) return <div className="text-center text-muted-foreground p-10 h-full flex items-center justify-center border rounded-xl border-dashed">선택된 이슈가 없습니다.</div>;

    const isResolved = issue.status === "RESOLVED";

    // Normalize issue type
    const issueType = issue.issueType || "";

    // Image list (combine all available sources)
    const images = issue.imageUrls && issue.imageUrls.length > 0 
        ? issue.imageUrls 
        : (issue.imageUrl ? [issue.imageUrl] : []);
    
    const activeImage = images[selectedImageIndex] || images[0];

    const getResolvedText = () => {
        if (issue.adminDecision) return `✅ ${issue.adminDecision}`;
        return "✔️ 처리 완료됨";
    };

    return (
        <Card className="h-full border-l-0 rounded-l-none shadow-none md:border-l md:rounded-l-xl md:shadow-sm flex flex-col overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
                {/* Header */}
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-card z-10 h-14 min-h-[3.5rem]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* Type Badge */}
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border shrink-0",
                            issueType === "OUT_OF_STOCK" 
                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                            {issueType === "OUT_OF_STOCK" ? "재고" : "파손"}
                        </span>
                        
                        {/* Info */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-700 truncate">
                                {issue.productName || "상품정보 없음"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {issue.createdAt ? timeAgo(issue.createdAt) : "-"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {isResolved && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mr-1">완료</Badge>}
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Image Area */}
                    {/* Image Area */}
                    <div className="flex flex-col gap-3 mb-6">
                        <div className="relative aspect-square w-4/5 mx-auto bg-slate-50 rounded-xl overflow-hidden group shadow-sm border border-slate-100">
                            {activeImage ? (
                                <img 
                                    src={activeImage} 
                                    alt="Issue" 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2 p-6 text-center">
                                    <span className="font-medium text-slate-400">이미지가 등록되지 않았습니다</span>
                                    <span className="text-xs text-slate-300">
                                        재고 부족 등 현장 상황에 따라<br/>이미지가 첨부되지 않을 수 있습니다.
                                    </span>
                                </div>
                            )}

                            {/* Overlay info */}
                            <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm font-medium">
                                긴급도: {issue.urgency <= 2 ? "HIGH" : issue.urgency === 3 ? "MID" : "LOW"}
                            </div>
                        </div>

                        {/* Image Gallery Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2 pb-2 overflow-x-auto scroller-hide">
                                {images.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={cn(
                                            "relative w-20 h-14 rounded-md overflow-hidden border-2 transition-all shrink-0",
                                            selectedImageIndex === idx ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img src={url} alt={`Issue ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Analysis */}
                    {issue.aiResult && (
                        <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="text-sm font-semibold text-blue-800 mb-1">AI 분석 결과 ({issue.aiResult})</div>
                            <div className="text-sm text-blue-600">
                                {issue.summary || "특이사항 없음"}
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
                            </div>
                        ) : (
                            <div className="space-y-4">
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
                                        onClick={() => handleDecision(issueType === "DAMAGED" ? "DAMAGED" : "FIXED")}
                                        disabled={processing}
                                    >
                                        {issueType === "DAMAGED" ? "파손 확정" : "조치 완료"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button 
                            size="lg" 
                            variant="outline" 
                            className="w-full border-blue-200 hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2"
                            onClick={handleWebRTCCall}
                        >
                            <Phone className="h-4 w-4" />
                            화상 연결 (WebRTC)
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
