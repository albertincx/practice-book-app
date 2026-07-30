// components/Sidebar.tsx

import type {PdfMetadata} from '../utils.ts';
import {FileText, FileUp, FolderOpen, Trash2, X} from "lucide-react";
import {AddPdfFromUrl} from "./AddPdfFromUrl.tsx";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    t: any; // объект переводов
    pdfList: PdfMetadata[];
    activePdfId: string | null;
    loadPdf: (file: File) => void;
    loadPdfFromUrl: (url: string, fileName?: string) => void;
    loadPdfFromLibrary: (id: string) => void;
    handleDeletePdf: (id: string, event: React.MouseEvent) => void;
}

export default function Sidebar({
                                    isOpen: isSidebarOpen,
                                    setIsOpen: setIsSidebarOpen,
                                    t,
                                    pdfList,
                                    activePdfId,
                                    loadPdf,
                                    loadPdfFromUrl,
                                    loadPdfFromLibrary,
                                    handleDeletePdf,
                                }: SidebarProps) {
    return (
        <>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-zinc-950/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={`
          fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out
          lg:static lg:z-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:-translate-x-full lg:border-r-0'}
        `}
            >
                <div className="flex h-[57px] items-center justify-between border-b border-zinc-200 px-4 shrink-0">
                    <div className="flex items-center gap-2 font-semibold text-zinc-800">
                        <FolderOpen className="h-5 w-5 text-zinc-500"/>
                        <span>{t.libraryTitle}</span>
                    </div>
                    <button
                        aria-label="Toggle sidebar"
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="h-4 w-4"/>
                    </button>
                </div>

                <div className="p-3 border-b border-zinc-100 shrink-0">
                    <label
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 py-2.5 px-4 text-sm font-medium text-white shadow hover:bg-zinc-800 active:scale-95 transition-all">
                        <FileUp className="h-4 w-4"/>
                        <span>{t.addPdf}</span>
                        <input
                            className="sr-only"
                            type="file"
                            accept="application/pdf"
                            onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) {
                                    void loadPdf(file)
                                }
                                event.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
                <AddPdfFromUrl
                    addFromUrl={loadPdfFromUrl}
                />
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pdfList.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500">
                            <FileText className="mx-auto h-8 w-8 opacity-40 mb-2"/>
                            <p className="text-xs">{t.emptyLibrary}</p>
                            <p className="text-[10px] mt-1">{t.emptyLibrarySub}</p>
                        </div>
                    ) : (
                        pdfList.map((item) => {
                            const isActive = item.id === activePdfId
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => void loadPdfFromLibrary(item.id)}
                                    className={`
                    group relative flex cursor-pointer gap-3 rounded-lg p-2.5 transition-all text-left
                    ${isActive ? 'bg-zinc-100 border-l-4 border-zinc-950 font-medium' : 'hover:bg-zinc-50 border-l-4 border-transparent'}
                  `}
                                >
                                    <FileText
                                        className={`h-5 w-5 shrink-0 mt-0.5 ${isActive ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-500'}`}/>
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm ${isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-700'}`}>
                                            {item.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500">
                                            {item.strokes && item.strokes.length > 0 && (
                                                <span>{t.drawings}: {item.strokes.length}</span>
                                            )}
                                            {item.texts && item.texts.length > 0 && (
                                                <span>• {t.texts}: {item.texts.length}</span>
                                            )}
                                            <span>• {t.pageShort}: {item.pageNumber || 1}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t.deleteConfirm.replace('"{name}"', item.name)}
                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-500 hover:text-red-600 transition-all self-center"
                                        onClick={(e) => void handleDeletePdf(item.id, e)}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>
        </>
    );
}
