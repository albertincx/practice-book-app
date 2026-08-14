import React from 'react';

interface ThemeButtonsProps {
    options: any;
    label?: string;
    theme: string;
    setTheme: (theme: string) => void;
    resolvedTheme?: string;
}

export const ThemeButtons: React.FC<ThemeButtonsProps> = ({
                                                              options,
                                                              theme,
                                                              setTheme,
                                                              resolvedTheme,
                                                              label = 'Theme'
                                                          }) => {
    // const options = [
    //     { value: 'system', label: 'Auto', icon: Monitor },
    //     { value: 'light', label: 'Light', icon: Sun },
    //     { value: 'dark', label: 'Dark', icon: Moon },
    // ];

    const isDark = resolvedTheme === 'dark';

    return (
        <div className="w-full max-w-sm_">
            <label className={`block text-sm font-medium 'dark:text-zinc-300' : 'text-zinc-700' mb-1`}>
                {label}
            </label>
            <div
                className={`grid grid-cols-3 gap-1 p-1 rounded-md border dark:border-zinc-700 dark:bg-zinc-800 border-zinc-200 bg-zinc-100 shadow-sm`}>
                {options.map(({value, label, icon: Icon}: any) => {
                    const isActive = theme === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTheme(value)}
                            className={`flex items-center justify-center gap-1.5 h-8 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                    ? isDark
                                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                                        : 'bg-white text-zinc-900 shadow-sm'
                                    : isDark
                                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                            }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5 flex-none"/>}
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
