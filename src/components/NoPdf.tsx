// components/NoPdf.tsx

import {FileUp} from "lucide-react";
import {useState} from "react";

interface IProps {
    t: any; // объект переводов
    loadBooks: (files: FileList | File[]) => void;
    loadPdfFromUrl: (url: string, fileName?: string) => void;
}

export default function NoPdf({
                                  t,
                                  loadBooks,
                                  loadPdfFromUrl,
                              }: IProps) {


    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            void loadBooks(files)
        }
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`m-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center shadow-sm transition-colors ${
                isDragging
                    ? 'border-zinc-950 bg-zinc-50'
                    : 'border-zinc-300 bg-white'
            }`}
        >
            <FileUp className="h-10 w-10 text-zinc-500"/>
            <label
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white active:scale-95">
                {t.addPdf || 'Add Books (PDF, EPUB, JPG)'}
                <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept="application/pdf,.pdf,application/epub+zip,.epub,image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => {
                        const files = event.target.files
                        if (files && files.length > 0) {
                            void loadBooks(files)
                        }
                        event.currentTarget.value = ''
                    }}
                />
            </label>
            <div>OR</div>
            <label
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white active:scale-95"
                onClick={() => {
                    const sampleUrl = '/c4611_sample_explain_c4611_sample_explain.pdf';
                    void loadPdfFromUrl(sampleUrl)
                }}
            >
                {t.addExPdf}
            </label>
        </div>
    )
}
