import React, { useState } from 'react';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';
import { Spinner } from './Spinner';
import type { DoubtResponse } from '../services/backendClient';
import { ExportButton } from './ExportButton';

interface DoubtPanelProps {
    onAnswerDoubt: (question: string) => Promise<DoubtResponse>;
    onAnswerGeneral: (question: string) => Promise<DoubtResponse>;
    onCitationClick?: (page: number) => void;
    isReady: boolean;
    initialQuestion?: string;
}

export const DoubtPanel: React.FC<DoubtPanelProps> = ({ onAnswerDoubt, onAnswerGeneral, onCitationClick, isReady, initialQuestion }) => {
    const [question, setQuestion] = useState(initialQuestion || '');
    const [response, setResponse] = useState<DoubtResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFallbackPrompt, setShowFallbackPrompt] = useState(false);
    const [rejectFallback, setRejectFallback] = useState(false);

    // If a new initialQuestion is passed from outside, you could handle it via an effect if needed,
    // but typically it mounts with it.
    
    // Auto-submit if initialQuestion is provided and we haven't answered yet
    React.useEffect(() => {
        if (initialQuestion && isReady && !response && !isLoading) {
            handleAskDoc(initialQuestion);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuestion, isReady]);

    const handleAskDoc = async (q: string) => {
        setIsLoading(true);
        setResponse(null);
        setError(null);
        setShowFallbackPrompt(false);
        setRejectFallback(false);

        try {
            const res = await onAnswerDoubt(q);
            if (!res.found_in_doc) {
                setShowFallbackPrompt(true);
            } else {
                setResponse(res);
            }
        } catch (err) {
            setError('Sorry, I failed to process that. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !isReady) return;
        await handleAskDoc(question);
    };

    const handleYesFallback = async () => {
        setIsLoading(true);
        setShowFallbackPrompt(false);
        try {
            const res = await onAnswerGeneral(question);
            setResponse(res);
        } catch (err) {
            setError('Failed to fetch general knowledge. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNoFallback = () => {
        setShowFallbackPrompt(false);
        setRejectFallback(true);
    };

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 tracking-tight">AI Chat Assistant</h3>
                {response && (
                    <ExportButton title="Q&A Session" contentType="qa" content={{ question, answer: response.answer }} />
                )}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center space-x-3 mb-6">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={isReady ? "Ask a question about the document..." : "Document is being processed..."}
                    disabled={!isReady || isLoading}
                    className="flex-grow py-3.5 px-5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm placeholder-gray-400 font-medium"
                    aria-label="Ask a question"
                />
                <button
                    type="submit"
                    disabled={!isReady || isLoading || !question.trim()}
                    className="p-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    aria-label="Submit question"
                >
                   {isLoading ? <Spinner /> : <QuestionMarkIcon className="h-6 w-6" />}
                </button>
            </form>
            
            <div className="flex-grow bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-inner border border-white/50 overflow-y-auto min-h-[150px] transition-all duration-300">
                {error && <div className="text-red-700 bg-red-50/80 border border-red-200 p-4 rounded-xl mb-4 font-medium">{error}</div>}
                
                {isLoading ? (
                    <div className="text-center text-gray-500 py-8 animate-pulse">
                        <Spinner />
                        <p className="mt-3 font-medium">Analyzing...</p>
                    </div>
                ) : showFallbackPrompt ? (
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm text-center animate-fade-in-up">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h4 className="text-lg font-bold text-amber-800 mb-2">Topic Not Found</h4>
                        <p className="text-amber-700 mb-6">This topic is not found in your uploaded document.<br/>Would you like me to answer it using general knowledge?</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={handleYesFallback} className="px-6 py-2.5 bg-brand-primary text-white font-semibold rounded-xl shadow hover:bg-indigo-700 transition-colors">YES</button>
                            <button onClick={handleNoFallback} className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 font-semibold rounded-xl shadow-sm hover:bg-gray-50 transition-colors">NO</button>
                        </div>
                    </div>
                ) : rejectFallback ? (
                    <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center shadow-sm animate-fade-in-up">
                        <p className="text-blue-800 font-medium">Okay, I'll stick to your document only.</p>
                    </div>
                ) : response ? (
                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed bg-white/50 p-5 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                        {!response.found_in_doc && (
                            <div className="mb-4 bg-indigo-50 border-l-4 border-indigo-400 p-3 rounded text-indigo-800 text-sm font-semibold">
                                📘 General Explanation: (This answer is generated outside your document)
                            </div>
                        )}
                        <p className="whitespace-pre-wrap text-base">{response.answer}</p>
                        
                        {response.found_in_doc && response.source && typeof response.source !== 'string' && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 8H20"></path></svg>
                                    Source
                                </h4>
                                <button 
                                    onClick={() => onCitationClick && onCitationClick((response.source as any).page)}
                                    className="text-left w-full hover:bg-white p-3 rounded-lg border border-transparent hover:border-indigo-100 transition-colors group relative"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-brand-primary group-hover:text-indigo-700">Page {(response.source as any).page}</span>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Paragraph {(response.source as any).paragraph || 1}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 italic">"{(response.source as any).excerpt}..."</p>
                                    <div className="absolute inset-y-0 right-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10 px-4">
                        <div className="w-16 h-16 bg-indigo-50 text-brand-primary/50 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <QuestionMarkIcon className="h-8 w-8 text-brand-primary/60" />
                        </div>
                        <p className="font-medium text-lg text-gray-600 mb-2">How can I help you study?</p>
                        <p className="text-sm text-gray-400">Ask any question and I'll find the exact answer from your document.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
