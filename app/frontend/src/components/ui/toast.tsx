import { useEffect, useState } from 'react';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

let toastId = 0;
let addToastCallback: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export const toast = {
    success: (message: string) => {
        addToastCallback?.({ message, type: 'success' });
    },
    error: (message: string) => {
        addToastCallback?.({ message, type: 'error' });
    },
    info: (message: string) => {
        addToastCallback?.({ message, type: 'info' });
    },
    warning: (message: string) => {
        addToastCallback?.({ message, type: 'warning' });
    },
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        addToastCallback = (toast) => {
            const id = toastId++;
            setToasts((prev) => [...prev, { ...toast, id }]);

            // 3초 후 자동 제거
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3000);
        };

        return () => {
            addToastCallback = null;
        };
    }, []);

    const getToastStyles = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            case 'info':
                return 'bg-blue-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
        }
    };

    const getToastIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'info':
                return 'ℹ';
            case 'warning':
                return '⚠';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        ${getToastStyles(toast.type)}
                        px-4 py-3 rounded-lg shadow-lg
                        flex items-center gap-2
                        animate-in slide-in-from-right
                        min-w-[300px] max-w-[500px]
                    `}
                >
                    <span className="text-lg font-bold">{getToastIcon(toast.type)}</span>
                    <span className="flex-1">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
