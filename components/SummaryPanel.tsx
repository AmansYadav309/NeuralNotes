
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { Spinner } from './Spinner';
import { ToggleSwitch } from './ToggleSwitch';
import Flashcard from './Flashcard';
import ReactMarkdown from 'react-markdown';
import { ExportButton } from './ExportButton';
import { DiagramPanel } from './DiagramPanel';

interface SummaryPanelProps {
    summary: string;
    isSummarizing: boolean;
    summarizationProgress: number;
    isLoadingAudio: boolean;
    isPlaying: boolean;
    error: string | null;
    onSummarize: () => void;
    onListen: () => void;
    hasDocument: boolean;
    hasSummaries: boolean;
    isEli5: boolean;
    setIsEli5: (value: boolean) => void;
    isPreparing: boolean;
    summaryFormat: string;
    setSummaryFormat: (format: 'paragraph' | 'bullets' | 'mindmap' | 'flashcards' | 'mixed') => void;
    onGenerateDiagram?: (type: 'flowchart' | 'sequence' | 'mindmap') => Promise<string>;
}

const ShimmerEffect = () => (
    <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-4 bg-gray-200 rounded-full ${i === 3 ? 'w-2/3' : ''} animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:2000px_100%]`}></div>
        ))}
    </div>
);

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
    summary,
    isSummarizing,
    summarizationProgress,
    isLoadingAudio,
    isPlaying,
    error,
    onSummarize,
    onListen,
    hasDocument,
    hasSummaries,
    isEli5,
    setIsEli5,
    isPreparing,
    summaryFormat,
    setSummaryFormat,
    onGenerateDiagram
}) => {
    const [activeInternalTab, setActiveInternalTab] = React.useState<'summary' | 'visualize'>('summary');
    const [diagramType, setDiagramType] = React.useState<'flowchart' | 'sequence' | 'mindmap'>('flowchart');
    const [isGeneratingDiagram, setIsGeneratingDiagram] = React.useState(false);
    const [mermaidCode, setMermaidCode] = React.useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    const handleGenerateDiagram = async (type: 'flowchart' | 'sequence' | 'mindmap') => {
        if (!onGenerateDiagram) return;
        setIsGeneratingDiagram(true);
        setDiagramType(type);
        try {
            const code = await onGenerateDiagram(type);
            setMermaidCode(code);
        } catch (err) {
            console.error("Failed to generate diagram:", err);
            // Error handling can just be alert for now or we let DiagramPanel show valid issue
        } finally {
            setIsGeneratingDiagram(false);
        }
    };

    return (
        <div className={isFullScreen ? "fixed inset-0 z-50 bg-gray-50 p-6 md:p-12 overflow-y-auto w-full h-full" : "flex flex-col"}>
            <div className="flex items-center gap-3 md:space-x-4 w-full">
                <button
                    onClick={onSummarize}
                    disabled={isSummarizing || isPreparing || !hasDocument}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                    {isPreparing ? <><Spinner /><span className="ml-2">Preparing...</span></> : 
                     isSummarizing ? <><Spinner /><span className="ml-2">Summarizing...</span></> : 
                     <><SparklesIcon className="h-5 w-5 mr-2" /><span>Summarize Document</span></>
                    }
                </button>
                <button
                    onClick={onListen}
                    disabled={!summary || isLoadingAudio}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 text-base font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow hover:shadow-md transition-all duration-300"
                >
                    {isLoadingAudio ? <Spinner /> : isPlaying ? <StopIcon className="h-5 w-5 mr-2 text-rose-500" /> : <PlayIcon className="h-5 w-5 mr-2 text-emerald-500" />}
                    {isPlaying ? 'Stop' : 'Listen'}
                </button>
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="shrink-0 p-3.5 border border-gray-200 text-base font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 shadow hover:shadow-md transition-all duration-300"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? (
                        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20V14H3m12 6V14h6M9 4v6H3m12-6v6h6" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    )}
                </button>
            </div>

            {isSummarizing && (
                <div className="mt-6">
                    <div className="w-full bg-indigo-100/50 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-primary to-accent h-3 rounded-full relative" style={{ width: `${summarizationProgress}%`, transition: 'width 0.4s ease-out' }}>
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-center text-sm font-medium text-gray-500 mt-2">{Math.round(summarizationProgress)}% Complete</p>
                </div>
            )}

            <div className="flex gap-4 border-b border-gray-200 mt-8 mb-4">
                <button
                    onClick={() => setActiveInternalTab('summary')}
                    className={`pb-2 px-1 border-b-2 font-bold text-lg transition-colors ${activeInternalTab === 'summary' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    AI Summary
                </button>
                <button
                    onClick={() => setActiveInternalTab('visualize')}
                    className={`pb-2 px-1 border-b-2 font-bold text-lg transition-colors ${activeInternalTab === 'visualize' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Visualize
                </button>
            </div>

            {activeInternalTab === 'summary' ? (
                <>
                    <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-3">
                             {summary && (
                                 <ExportButton title="Document Summary" contentType="summary" content={summary} />
                             )}
                         </div>
                         <div className="flex items-center space-x-4 bg-gray-50/80 p-1.5 rounded-xl border border-gray-100 shadow-sm">
                             <select
                                 value={summaryFormat}
                                 onChange={(e) => setSummaryFormat(e.target.value as any)}
                                 disabled={isSummarizing}
                                 className="bg-white border-gray-200 rounded-lg text-sm font-medium focus:ring-brand-primary focus:border-brand-primary py-2 px-3 shadow-sm outline-none transition-colors"
                             >
                                 <option value="paragraph">Paragraph</option>
                                 <option value="bullets">Bullet Points</option>
                                 <option value="mixed">Mixed (Para + Bullets)</option>
                                 <option value="mindmap">Text Mind Map</option>
                                 <option value="flashcards">Flashcards</option>
                             </select>
                             <div className="px-2">
                                <ToggleSwitch label="Explain Like I'm 5" checked={isEli5} onChange={setIsEli5} disabled={isSummarizing}/>
                             </div>
                         </div>
                    </div>
                    
                    <div className="flex-grow bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-inner border border-white/50 overflow-y-auto min-h-[250px] transition-all duration-300">
                        {error && <div className="text-red-700 bg-red-50/80 border border-red-200 p-4 rounded-xl mb-4 font-medium">{error}</div>}
                        
                        {isPreparing ? (
                             <div className="text-center text-gray-500 pt-8">
                                <Spinner />
                                <p className="mt-2">Preparing document for analysis...</p>
                            </div>
                        ) : isSummarizing && !summary ? (
                             <div className="text-center text-gray-500 pt-8">
                                <Spinner />
                                <p className="mt-2">Generating summaries...</p>
                            </div>
                        ): summary ? (
                            typeof summary === 'string' ? (
                                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                                    <ReactMarkdown>
                                        {summary.replace(/Here is a concise summary of the CURRENT PAGE text in 3-5 sentences:?\s*/i, '')}
                                    </ReactMarkdown>
                                </div>
                            ) : summaryFormat === 'flashcards' && Array.isArray(summary) ? (
                                <Flashcard cards={summary} />
                            ) : null
                        ) : !hasSummaries ? (
                            <div className="text-center text-gray-500 pt-8">
                                <SparklesIcon className="h-12 w-12 mx-auto text-gray-300" />
                                <p className="mt-2">Click "Summarize Document" to generate summaries for all pages.</p>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 pt-8">
                                <p>Summary for this page will appear here.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col space-y-6">
                    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl justify-center">
                        <button 
                            onClick={() => handleGenerateDiagram('flowchart')}
                            disabled={isGeneratingDiagram}
                            className={`px-4 py-2 rounded-lg font-semibold transition bg-blue-100 text-blue-700 hover:bg-blue-200 ${diagramType === 'flowchart' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                            Flowchart
                        </button>
                        <button 
                            onClick={() => handleGenerateDiagram('sequence')}
                            disabled={isGeneratingDiagram}
                            className={`px-4 py-2 rounded-lg font-semibold transition bg-purple-100 text-purple-700 hover:bg-purple-200 ${diagramType === 'sequence' ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
                        >
                            Sequence
                        </button>
                        <button 
                            onClick={() => handleGenerateDiagram('mindmap')}
                            disabled={isGeneratingDiagram}
                            className={`px-4 py-2 rounded-lg font-semibold transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ${diagramType === 'mindmap' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                        >
                            Mind Map
                        </button>
                    </div>

                    {isGeneratingDiagram ? (
                        <div className="flex flex-col justify-center items-center py-20 bg-white/60 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-inner animate-pulse">
                            <Spinner />
                            <p className="mt-4 text-indigo-800 font-medium tracking-wide">Generating {diagramType} via AI...</p>
                        </div>
                    ) : mermaidCode ? (
                        <DiagramPanel mermaidCode={mermaidCode} />
                    ) : (
                        <div className="flex flex-col justify-center items-center py-20 bg-white/60 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-inner text-gray-500">
                            <SparklesIcon className="h-10 w-10 mb-3 text-indigo-300" />
                            <p>Select a diagram type to visualize this document.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
