import { Phone } from "lucide-react";

export default function Contact() {
    return (
        <div className="flex flex-col h-full bg-[#f8f9fc] p-8">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <Phone className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">통화 대기 중</h2>
                <p className="text-slate-500 max-w-md mb-8">
                    왼쪽 목록에서 온라인 상태인 작업자를 선택하여 통화를 시작하거나,
                    걸려오는 전화를 기다리세요.
                </p>

                {/* Placeholder for future content */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                    API 연결 및 WebRTC 구현 예정 영역
                </div>
            </div>
        </div>
    );
}