import { useState, useEffect } from "react";
import { issueService } from "@/services/issueService";
import type { IssueDetailData } from "@/types/issue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    X, 
    Box
} from "lucide-react";
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
                <div className="flex items-center justify-between p-6 border-b bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-shadow shadow-sm",
                            issueType === "OUT_OF_STOCK" 
                                ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                                : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                            <Box className="w-5 h-5" />
                        </div>
                        
                        <div className="flex flex-col">
                            <h2 className="text-sm font-bold text-slate-800 leading-tight">
                                {issue.productName || "상품정보 없음"}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight",
                                    issueType === "OUT_OF_STOCK" 
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                    {issueType === "OUT_OF_STOCK" ? "Stock" : "Damage"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {issue.createdAt ? timeAgo(issue.createdAt) : "-"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isResolved ? (
                            <Badge className={cn(
                                "font-bold text-[10px] px-2.5 py-1 rounded-lg border shadow-sm",
                                issue.adminDecision === "NORMAL" 
                                    ? "bg-teal-50 text-teal-600 border-teal-100" 
                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                                {getResolvedText()}
                            </Badge>
                        ) : (
                            <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold text-[10px] px-2.5 py-1 rounded-lg border shadow-sm">승인 대기</Badge>
                        )}
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
                    {/* Image Area */}
                    <div className="flex flex-col gap-4 mb-8">
                        {/* ... existing content ... */}
                         <div className="relative aspect-video w-full bg-slate-50 rounded-2xl overflow-hidden group shadow-inner border border-slate-100">
                            {activeImage ? (
                                <img 
                                    src={activeImage} 
                                    alt="Issue" 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-3 p-8 text-center bg-slate-50/50">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200/50">
                                        <Box className="w-6 h-6 opacity-40" />
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-600">이미지가 없습니다</h3>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        재고 부족 등 현장 상황에 따라<br/>이미지가 첨부되지 않을 수 있습니다.
                                    </p>
                                </div>
                            )}

                            {/* Urgency Overlay */}
                            <div className={cn(
                                "absolute top-5 right-5 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-lg border",
                                issue.urgency <= 2 
                                    ? "bg-rose-500/80 text-white border-rose-400" 
                                    : issue.urgency === 3 
                                        ? "bg-amber-500/80 text-white border-amber-400" 
                                        : "bg-slate-500/80 text-white border-slate-400"
                            )}>
                                {issue.urgency <= 2 ? "HIGH PRIORITY" : issue.urgency === 3 ? "MEDIUM PRIORITY" : "LOW PRIORITY"}
                            </div>
                        </div>

                        {/* Image Gallery Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2.5 pb-2 overflow-x-auto scroller-hide px-1">
                                {images.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={cn(
                                            "relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 shadow-sm",
                                            selectedImageIndex === idx ? "border-blue-500 scale-105 z-10" : "border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200"
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
                        <div className="mb-8 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI ANALYSIS Result</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold border transitions-colors",
                                    issue.aiResult === "PASS" ? "bg-blue-50 text-blue-600 border-blue-100" : 
                                    issue.aiResult === "FAIL" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                    "bg-violet-50 text-violet-600 border-violet-100"
                                )}>
                                    {issue.aiResult}
                                </span>
                            </div>
                            <div className="p-4 bg-white">
                                <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                                    {issue.summary || "특이사항 없이 정상 확인되었습니다."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status & Actions */}
                    {!isResolved && (
                        <div className="mt-auto space-y-3.5">
                            <div className="w-full">
                                {issue.issueType === "OUT_OF_STOCK" ? (
                                    <Button
                                        size="lg"
                                        className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-bold shadow-sm transition-all active:scale-[0.98]"
                                        onClick={() => handleDecision("FIXED")}
                                        disabled={processing}
                                    >
                                        승인
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            size="lg"
                                            className="h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-bold shadow-sm transition-all active:scale-[0.98]"
                                            onClick={() => handleDecision("NORMAL")}
                                            disabled={processing}
                                        >
                                            정상 확인
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="h-12 rounded-full border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                                            onClick={() => handleDecision(issueType === "DAMAGED" ? "DAMAGED" : "FIXED")}
                                            disabled={processing}
                                        >
                                            {issueType === "DAMAGED" ? "파손 확정" : "조치 완료"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <Button 
                                size="lg" 
                                variant="outline" 
                                className="w-full h-[3.25rem] rounded-full border-[#304FFF]/30 bg-white text-[#304FFF] font-bold flex items-center justify-center gap-2.5 hover:bg-[#304FFF]/5 hover:border-[#304FFF]/50 hover:text-[#304FFF] shadow-[0_4px_12px_-4px_rgba(48,79,255,0.1)] transition-all duration-300 active:scale-[0.98]"
                                onClick={handleWebRTCCall}
                            >
                                화상 통화 연결
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Custom Scrollbar Style - Completely Hidden */}
            <style>{`
                .scrollbar-hidden::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
                .scrollbar-hidden {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
            `}</style>
        </Card>
    );
}
