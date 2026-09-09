import React, { useState, createContext, useContext, type ReactNode } from 'react';

interface ModalItem {
    id: string;
    title: string;
    content: ReactNode;
}

interface ModalContextType {
    openModal: (title: string, content: ReactNode) => void;
    closeModal: (id: string) => void;
    minimizeModal: (id: string) => void;
    restoreModal: (id: string) => void;
    modals: ModalItem[];
    minimizedIds: string[];
    activeId: string | null;
    setActiveId: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modals, setModals] = useState<ModalItem[]>([]);
    const [minimizedIds, setMinimizedIds] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    const openModal = (title: string, content: ReactNode) => {
        const id = Math.random().toString(36).substring(2, 9);
        setModals((prev) => [...prev, { id, title, content }]);
        setMinimizedIds((prev) => prev.filter((item) => item !== id));
        setActiveId(id);
    };

    const closeModal = (id: string) => {
        setModals((prev) => prev.filter((m) => m.id !== id));
        setMinimizedIds((prev) => prev.filter((mId) => mId !== id));
        setActiveId((prev) => (prev === id ? modals[modals.length - 2]?.id || null : prev));
    };

    const minimizeModal = (id: string) => {
        if (!minimizedIds.includes(id)) {
            setMinimizedIds((prev) => [...prev, id]);
        }
        if (activeId === id) {
            const remainingActive = modals.find((m) => m.id !== id && !minimizedIds.includes(m.id));
            setActiveId(remainingActive ? remainingActive.id : null);
        }
    };

    const restoreModal = (id: string) => {
        setMinimizedIds((prev) => prev.filter((mId) => mId !== id));
        setActiveId(id);
    };

    return (
        <ModalContext.Provider
            value={{
                openModal,
                closeModal,
                minimizeModal,
                restoreModal,
                modals,
                minimizedIds,
                activeId,
                setActiveId,
            }}
        >
            {children}
            <ModalManager />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
};

export const ModalManager: React.FC = () => {
    const { modals, minimizedIds, activeId, closeModal, minimizeModal, restoreModal, setActiveId } = useModal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const activeModal = modals.find((m) => m.id === activeId && !minimizedIds.includes(m.id));

    return (
        <>
            {/* Активное модальное окно на 90% */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-[90vw] h-[90vh] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
                        {/* Шапка */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-semibold truncate">{activeModal.title}</h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => minimizeModal(activeModal.id)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    title="Hide"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => closeModal(activeModal.id)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
                                    title="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Контент */}
                        <div className="flex-1 p-6 overflow-y-auto">{activeModal.content}</div>
                    </div>
                </div>
            )}

            {/* Плавающая кнопка слева снизу */}
            {modals.length > 0 && (
                <div className="fixed bottom-6 left-6 z-50">
                    {/* Меню переключения между свернутыми/всеми окнами */}
                    {isMenuOpen && (
                        <div className="absolute bottom-14 left-0 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden mb-2 py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Opened ({modals.length})
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {modals.map((modal) => {
                                    const isMinimized = minimizedIds.includes(modal.id);
                                    const isActive = activeId === modal.id;

                                    return (
                                        <div
                                            key={modal.id}
                                            className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                                                isActive ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                            onClick={() => {
                                                if (isMinimized) {
                                                    restoreModal(modal.id);
                                                } else {
                                                    setActiveId(modal.id);
                                                }
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <span className="text-sm truncate mr-2">{modal.title}</span>
                                            <div className="flex items-center space-x-1">
                                                {isMinimized ? (
                                                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">
                            Hidden
                          </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            minimizeModal(modal.id);
                                                        }}
                                                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                                    >
                                                        Hide
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closeModal(modal.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Основная кнопка */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <span>Opened ({modals.length})</span>
                    </button>
                </div>
            )}
        </>
    );
};
