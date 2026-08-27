// src/components/ReloadPrompt.tsx
import React from 'react';
// @ts-ignore
import {useRegisterSW} from 'virtual:pwa-register/react';

export const ReloadPrompt: React.FC = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            // Проверка обновлений каждые 15 минут (по желанию)
            r && setInterval(() => r.update(), 15 * 60 * 1000);
        },
    });

    if (!needRefresh) return null;

    return (
        <div
            className="fixed bottom-5 right-5 z-50 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:text-white">
      <span className="text-sm font-medium">
        New version is available!
      </span>
            <div className="flex gap-2">
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                    Update
                </button>
                <button
                    onClick={() => setNeedRefresh(false)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                >
                    Later
                </button>
            </div>
        </div>
    );
};
