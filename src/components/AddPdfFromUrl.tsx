import { useState } from "react";

export const AddPdfFromUrl = ({ addFromUrl }: any) => {
    const [url, setUrl] = useState('');
    const [pdfText, setPdfText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddPdf = async () => {
        if (!url.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const text = await addFromUrl(url);
            setPdfText(text);
        } catch (err: any) {
            console.error('Error adding PDF from URL:', err);
            setError(err.message || 'Failed to load PDF from URL');
        } finally {
            setIsLoading(false);
        }
    };

    const sampleUrl = '/c4611_sample_explain.pdf';

    return (
        <div className="max-w-xl mx-auto p-2 bg-white rounded-xl shadow-md border border-gray-100 space-y-2">
            <div>
                <h2 className="text-xl font-semibold text-gray-800">or Add PDF from URL</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Enter a direct link to a PDF file or{' '}
                    <button
                        type="button"
                        onClick={() => setUrl(sampleUrl)}
                        className="text-indigo-600 hover:text-indigo-800 underline focus:outline-none font-medium cursor-pointer"
                    >
                        use test sample
                    </button>
                </p>
            </div>

            <div className="flex gap-2">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    disabled={isLoading}
                />
                <button
                    onClick={handleAddPdf}
                    disabled={isLoading || !url.trim()}
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? 'Loading...' : 'Add PDF'}
                </button>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            {pdfText && (
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">PDF Text Content:</h3>
                    <pre className="p-4 text-xs bg-gray-50 text-gray-700 rounded-lg border border-gray-200 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                        {pdfText}
                    </pre>
                </div>
            )}
        </div>
    );
};
