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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-lg shadow-xl z-50 animate-slide-up text-sm font-medium ${
                typeStyles[type] || typeStyles.info
            }`}
        >
            <span>{message}</span>
            <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-lg font-bold leading-none transition-colors"
                aria-label="Close toast"
            >
                &times;
            </button>
        </div>
    );
}
