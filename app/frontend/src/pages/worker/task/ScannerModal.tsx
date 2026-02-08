import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { X } from "lucide-react";

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
    title: string;
    expectedValue?: string;
}

export default function ScannerModal({ isOpen, onClose, onScan, title, expectedValue }: ScannerModalProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const scannedRef = useRef(false); // 중복 스캔 방지 플래그
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setLastScanned(null);
            setIsSuccess(false);
            scannedRef.current = false; // 닫힐 때 초기화
            return;
        }

        const startScanner = async () => {
            try {
                setError(null);
                const reader = new BrowserMultiFormatReader();

                const devices = await BrowserMultiFormatReader.listVideoInputDevices();
                if (!devices || devices.length === 0) {
                    setError("카메라 장치를 찾을 수 없습니다. 브라우저 권한을 확인해 주세요.");
                    return;
                }
                // 후면 카메라 우선 선택
                const rearCamera = devices.find((device) =>
                    device.label.toLowerCase().includes("back") ||
                    device.label.toLowerCase().includes("rear") ||
                    device.label.toLowerCase().includes("environment")
                );

                const deviceId = rearCamera ? rearCamera.deviceId : devices[0].deviceId;
                console.log("Scanner devices:", devices);
                console.log("Selected device:", deviceId, rearCamera ? "(Rear)" : "(Default)");

                // 권한 확인 및 스트림 시작
                controlsRef.current = await reader.decodeFromVideoDevice(
                    deviceId,
                    videoRef.current!,
                    (result, err) => {
                        if (result && !scannedRef.current) {
                            const scannedText = result.getText().trim();
                            console.log("Scanned result:", scannedText);

                            // 즉시 플래그 세팅
                            scannedRef.current = true;
                            setLastScanned(scannedText);

                            // 시각적 피드백
                            setIsSuccess(true);
                            setTimeout(() => setIsSuccess(false), 300);

                            // 0.8초 후 다시 스캔 가능하게 리셋 (연타 방지용)
                            setTimeout(() => {
                                scannedRef.current = false;
                            }, 800);

                            onScan(scannedText);
                        }
                        if (err) {
                            const name = (err as any)?.name;
                            if (name !== "NotFoundException" && name !== "ChecksumException" && name !== "FormatException") {
                                console.debug("zxing error:", err);
                            }
                        }
                    }
                );
            } catch (e) {
                console.error("Camera open error:", e);
                setError("카메라를 열 수 없습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.");
            }
        };

        startScanner();

        return () => {
            controlsRef.current?.stop();
            controlsRef.current = null;

            const v = videoRef.current;
            const stream = (v?.srcObject as MediaStream | null) ?? null;
            stream?.getTracks().forEach((t) => t.stop());
            if (v) v.srcObject = null;
        };
    }, [isOpen, onScan]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/10">
                <div>
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    {expectedValue && (
                        <p className="text-[11px] font-bold text-indigo-400 mt-0.5 tracking-wider">EXPECTED: {expectedValue}</p>
                    )}
                </div>
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white active:scale-95 transition-transform">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Camera View */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-900">
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                />

                {/* Scanning Guide Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
                    <div className={`w-full aspect-square max-w-[280px] border-2 rounded-[40px] transition-all duration-200 ${isSuccess ? "border-green-400 scale-105 bg-green-400/20" : "border-white/30 scale-100 bg-transparent"
                        }`}>
                        {/* Corners */}
                        <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-indigo-600 rounded-tl-[40px]" />
                        <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-indigo-600 rounded-tr-[40px]" />
                        <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-indigo-600 rounded-bl-[40px]" />
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-indigo-600 rounded-br-[40px]" />
                    </div>
                </div>

                {/* Real-time Scan Preview */}
                {lastScanned && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 rounded-full shadow-2xl animate-bounce">
                        <p className="text-sm font-black text-white select-none">인식됨: {lastScanned}</p>
                    </div>
                )}
            </div>

            {/* Footer Controls */}
            <div className="p-8 bg-black/90 backdrop-blur-2xl border-t border-white/10 text-center space-y-6">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-200">바코드를 가이드 중앙에 비춰주세요</p>
                    <p className="text-xs text-gray-500">어두운 곳에서는 플래시를 켜주세요</p>
                </div>



                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-[13px] font-medium animate-shake">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
