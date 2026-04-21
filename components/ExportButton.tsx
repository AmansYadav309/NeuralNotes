import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

interface ExportButtonProps {
    title: string;
    contentType: 'summary' | 'qa' | 'quiz' | 'flashcards';
    content: any;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ title, contentType, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
        onSuccess: async (codeResponse) => {
            setIsOpen(false);
            setIsExporting(true);
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
                const response = await fetch(`${apiBase}/export-gdoc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        auth_code: codeResponse.code,
                        content_type: contentType,
                        content,
                        title
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Google Docs Export failed');
                }
                const data = await response.json();
                if (data.url) {
                    window.open(data.url, '_blank');
                }
            } catch (error) {
                 console.error("Failed to export to gdoc:", error);
                 alert("Export to Google Docs failed. Please try again.");
            } finally {
                setIsExporting(false);
            }
        },
        onError: errorResponse => {
            console.error(errorResponse);
            setIsExporting(false);
        }
    });

    const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
        setIsOpen(false);
        setIsExporting(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiBase}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format,
                    content_type: contentType,
                    content,
                    title
                }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neuralnotes-export.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export:", error);
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
                {isExporting ? (
                    <span className="animate-spin h-4 w-4 border-2 border-indigo-700 border-t-transparent rounded-full font-bold"></span>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                )}
                Export
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10 hidden sm:block" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                            >
                                Export as PDF
                            </button>
                            <button
                                onClick={() => handleExport('docx')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                            >
                                Export as Word (.docx)
                            </button>
                            <button
                                onClick={() => handleExport('txt')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                            >
                                Export as Text (.txt)
                            </button>
                            <button
                                onClick={() => login()}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-t border-gray-100 flex items-center gap-2"
                                role="menuitem"
                            >
                                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14.01 2.5l5.49 5.49v13.51a2.5 2.5 0 0 1-2.5 2.5h-10a2.5 2.5 0 0 1-2.5-2.5v-19a2.5 2.5 0 0 1 2.5-2.5h7.01zm-1.01 1.5h-6.01a1 1 0 0 0-1 1v19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-12.5h-5v-7.5zm1.5 1.06v4.94h4.94l-4.94-4.94z"/>
                                </svg>
                                Export to Google Docs
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
