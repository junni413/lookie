import { useState, useEffect } from "react";
import AdminPageHeader from "@/components/layout/AdminPageHeader";
import AdminListItem from "./components/contact/AdminListItem";
import { adminService } from "@/services/adminService";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore";
import type { AdminContact } from "@/types/AdminContact";
import { cn } from "@/utils/cn";
import { Search, Users, Video, Sparkles } from "lucide-react";

export default function Contact() {
    const [admins, setAdmins] = useState<AdminContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedZone, setSelectedZone] = useState<string | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");

    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const startCall = useCallStore((state) => state.startCall);

    // 구역 목록 (ID는 백엔드 zoneId와 매핑 추정: A=1, B=2...)
    const ZONES = [
        { id: "all", name: "전체" },
        { id: "1", name: "ZONE A" },
        { id: "2", name: "ZONE B" },
        { id: "3", name: "ZONE C" },
        { id: "4", name: "ZONE D" },
    ];

    // 관리자 목록 로드 (서버 사이드 필터링)
    useEffect(() => {
        if (!token) return;

        let ignore = false;

        // 검색어 디바운싱 (300ms)
        const timerId = setTimeout(async () => {
            setLoading(true);
            try {
                const params: any = {};
                if (searchQuery) params.name = searchQuery;
                if (selectedZone !== "all") params.zoneId = selectedZone;

                const data = await adminService.getAdmins(token, params);
                if (ignore) return;

                if (!currentUser?.userId) {
                    setAdmins(data);
                    return;
                }

                // 본인 제외 및 중복 제거 (필수는 아니지만 안전장치)
                const filtered = data.filter((admin) => String(admin.userId) !== String(currentUser.userId));
                // const unique = ... (service handles mapping, list likely unique from DB)

                setAdmins(filtered);
            } catch (error) {
                if (!ignore) console.error("관리자 목록 로드 실패:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        }, 300);

        return () => {
            ignore = true;
            clearTimeout(timerId);
        };
    }, [token, currentUser, selectedZone, searchQuery]);

    // 통화 시작 핸들러
    const handleCallClick = (admin: AdminContact) => {
        if (!currentUser) {
            alert("로그인이 필요합니다.");
            return;
        }
        startCall(currentUser.userId, admin.userId, null, admin.name);
    };



    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            <AdminPageHeader
                title="실시간 통화"
                description="작업자 그리고 또다른 관리자와 실시간 화상 통화를 진행합니다."
            />

            <div className="flex-1 px-8 pb-6 pt-0 flex gap-6 min-h-0">
                {/* 왼쪽: 관리자 리스트 */}
                <div className="w-[420px] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    {/* 헤더 */}
                    <div className="px-6 py-5 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-primary/10">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" strokeWidth={2.5} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">관리자 목록</h3>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                    {admins.length}명 {selectedZone !== "all" && `· ${ZONES.find(z => z.id === selectedZone)?.name || selectedZone}`}
                                </p>
                            </div>
                        </div>

                        {/* 검색 입력 */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-hover:text-primary" />
                            <input
                                type="text"
                                placeholder="이름으로 검색하세요!"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm hover:shadow-md hover:border-primary/30 hover:scale-[1.02]"
                            />
                        </div>
                    </div>

                    {/* 구역 필터 탭 */}
                    <div className="flex border-b bg-white overflow-x-auto no-scrollbar px-4">
                        {ZONES.map((zone) => (
                            <button
                                key={zone.id}
                                onClick={() => setSelectedZone(zone.id)}
                                className={cn(
                                    "relative flex-1 min-w-[65px] py-3 px-3 text-xs font-semibold transition-all duration-200",
                                    selectedZone === zone.id
                                        ? "text-primary"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {zone.name}
                                {selectedZone === zone.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 관리자 리스트 */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
                        {loading ? (
                            <div className="flex items-center justify-center h-40 text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <p className="text-sm">로딩 중...</p>
                                </div>
                            </div>
                        ) : admins.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-4">
                                <Search className="w-12 h-12 mb-3 text-slate-300" />
                                <p className="text-sm font-medium text-slate-600">
                                    {searchQuery ? "검색 결과가 없습니다" : "해당 구역의 관리자가 없습니다"}
                                </p>
                                {searchQuery && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        다른 검색어를 입력해보세요
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {admins.map((admin) => (
                                    <AdminListItem
                                        key={admin.userId}
                                        admin={admin}
                                        assignedZone={admin.assignedZone || "미배정"}
                                        isOnline={admin.isOnline || false}
                                        onCallClick={handleCallClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 오른쪽: WebRTC 화면 */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
                        {/* 배경 장식 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-purple-500/3" />
                        <div className="absolute top-10 right-10 w-32 h-32 bg-primary/3 rounded-full blur-3xl" />
                        <div className="absolute bottom-10 left-10 w-40 h-40 bg-purple-500/3 rounded-full blur-3xl" />

                        {/* 콘텐츠 */}
                        <div className="relative z-10">
                            {/* 아이콘 */}
                            <div className="relative mb-8 inline-block">
                                <div className="w-28 h-28 bg-gradient-to-br from-primary/8 to-indigo-500/8 rounded-[2rem] flex items-center justify-center shadow-sm border border-primary/10">
                                    <Video className="w-14 h-14 text-primary" strokeWidth={1.5} />
                                </div>
                                {/* 반짝이는 효과 */}
                                <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-primary/15 to-indigo-500/15 rounded-full flex items-center justify-center border border-white shadow-sm">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                </div>
                            </div>

                            {/* 텍스트 */}
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">
                                통화 대기 중
                            </h2>
                            <p className="text-slate-500 max-w-md leading-relaxed mb-6">
                                왼쪽 목록에서 온라인 상태인 관리자를 선택하여<br />
                                실시간 화상 통화를 시작하세요
                            </p>

                            {/* 안내 카드 */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs text-primary font-medium">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                온라인 상태 확인 가능
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 커스텀 스크롤바 스타일 - 완전히 숨김 */}
            <style>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                }
            `}</style>
        </div>
    );
}
