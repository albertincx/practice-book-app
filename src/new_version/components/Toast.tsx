import {useEffect} from "react";

export default function Toast({message, type = "info", onClose, duration = 3000}: any) {
    useEffect(() => {
        if (!duration) return;

        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    // Variant styles based on toast type
    const typeStyles: any = {
        info: "bg-neutral-800 text-white",
        success: "bg-emerald-700 text-white",
        error: "bg-rose-700 text-white",
    };

    return (
        <div
            className={`fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md w-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-5 rounded-lg shadow-xl z-50 animate-slide-up text-sm font-medium ${
                typeStyles[type] || typeStyles.info
            }`}
        >
            <span className="flex-1 break-words">{message}</span>
            <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-lg font-bold leading-none transition-colors p-1 -m-1"
                aria-label="Close toast"
            >
                &times;
            </button>
        </div>
    );
}
