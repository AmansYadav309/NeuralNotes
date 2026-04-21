import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { analyzePapers, generateExamAnswer } from '../services/backendClient';
import { AnalysisResponse, QuestionVariant } from '../types';
import { ExportButton } from './ExportButton';

export const QuestionAnalyzer: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isHovering, setIsHovering] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Answer Modal State
    const [selectedQuestion, setSelectedQuestion] = useState<QuestionVariant | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAnswer, setGeneratedAnswer] = useState<{ answer: string, marks: number } | null>(null);
    const [notesFile, setNotesFile] = useState<File | null>(null);
    const [selectedMarks, setSelectedMarks] = useState<number>(8);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const notesInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (droppedFiles.length > 0) {
            setFiles(prev => [...prev, ...droppedFiles].slice(0, 5)); // max 5 files
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (files.length === 0) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const res = await analyzePapers(files);
            setAnalysis(res);
        } catch (err: any) {
            setError(err.message || "Failed to analyze papers");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const openAnswerModal = (q: QuestionVariant) => {
        setSelectedQuestion(q);
        setGeneratedAnswer(null);
    };

    const closeAnswerModal = () => {
        setSelectedQuestion(null);
        setGeneratedAnswer(null);
    };

    const handleGenerateAnswer = async () => {
        if (!selectedQuestion) return;
        setIsGenerating(true);
        try {
            const res = await generateExamAnswer(
                selectedQuestion.question_variants[0],
                selectedQuestion.topic,
                selectedMarks,
                notesFile
            );
            setGeneratedAnswer({ answer: res.answer, marks: res.marks });
        } catch (err: any) {
            console.error(err);
            alert("Failed to generate answer: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Note upload helper
    const handleNotesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setNotesFile(e.target.files[0]);
        }
    };

    return (
        <div className="w-full flex-grow flex flex-col items-center justify-start relative p-4 lg:p-8 animate-fade-in-up">
            <div className="w-full max-w-5xl mx-auto space-y-8">
                
                <div className="text-center">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">Question Paper Analyzer</h2>
                    <p className="text-gray-500">Upload past question papers and automatically extract, map, and answer important questions.</p>
                </div>

                {!analysis ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 transform transition-all duration-500 hover:shadow-2xl flex flex-col items-center">
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                            onDragLeave={() => setIsHovering(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] ${isHovering ? 'border-primary bg-indigo-50 text-indigo-600' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-primary hover:bg-white'}`}
                        >
                            <svg className="w-16 h-16 mb-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xl font-bold mb-2">Drop Question Papers here</span>
                            <span className="text-sm">or click to browse PDF files (Up to 5)</span>
                            <input type="file" multiple accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                        </div>

                        {files.length > 0 && (
                            <div className="w-full mt-6 space-y-3">
                                <h4 className="font-semibold text-gray-700 text-left">Selected Papers ({files.length}):</h4>
                                <div className="flex flex-col space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                            <span className="text-gray-700 truncate font-medium">{file.name}</span>
                                            <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 font-bold p-1">&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg font-bold text-lg transition flex items-center justify-center space-x-2"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Analyzing your papers...</span>
                                        </>
                                    ) : (
                                        <span>Analyze Papers</span>
                                    )}
                                </button>
                                {error && <p className="text-red-500 mt-2 text-center text-sm">{error}</p>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in-up space-y-8 w-full max-w-5xl">
                        <div className="bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{analysis.subject_name || "Extracted Subject"}</h3>
                                <p className="text-gray-500 text-sm">{analysis.total_papers_analyzed} Papers Analyzed</p>
                            </div>
                            <button onClick={() => setAnalysis(null)} className="text-sm px-4 py-2 mt-4 md:mt-0 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                                Analyze Different Papers
                            </button>
                        </div>
                        
                        {/* Notes upload banner across all questions */}
                        <div className="bg-amber-50 p-4 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h4 className="font-bold text-amber-800">Teacher's Note (Optional)</h4>
                                <p className="text-sm text-amber-700">Upload your unit notes PDF. AI will use it aligning answers precisely to your teacher's material.</p>
                                {notesFile && <p className="text-sm font-semibold text-emerald-600 mt-1">✓ Attached: {notesFile.name}</p>}
                            </div>
                            <button onClick={() => notesInputRef.current?.click()} className="px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 rounded font-semibold text-sm whitespace-nowrap">
                                {notesFile ? "Change File" : "Upload Notes"}
                            </button>
                            <input type="file" ref={notesInputRef} className="hidden" accept="application/pdf" onChange={handleNotesUpload} />
                        </div>

                        {analysis.units.map((unit, uIdx) => (
                            <div key={uIdx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                                <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                                    <h3 className="text-xl font-bold text-indigo-800">Unit {unit.unit_number}: {unit.unit_name || "Miscellaneous"}</h3>
                                </div>
                                <div className="p-4 space-y-4">
                                    {unit.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="border border-gray-100 bg-gray-50 rounded-xl p-5 hover:border-indigo-200 transition-colors shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                                <div className="flex-1 w-full relative">
                                                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-2">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded tracking-wider ${
                                                            q.priority === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                            q.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                            'bg-green-100 text-green-700 border border-green-200'
                                                        }`}>
                                                            {q.priority}
                                                        </span>
                                                        <span className="text-gray-500 text-sm font-medium">Asked {q.frequency} times</span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-gray-800">{q.topic}</h4>
                                                    <p className="text-gray-600 text-sm mt-1">{q.core_idea}</p>
                                                    <div className="mt-3 text-sm text-gray-500 bg-white p-3 rounded border border-gray-100">
                                                        <span className="font-semibold">Variants: </span>
                                                        <ul className="list-disc pl-5 mt-1">
                                                            {q.question_variants.slice(0, 2).map((variant, i) => (
                                                                <li key={i}>{variant}</li>
                                                            ))}
                                                            {q.question_variants.length > 2 && <li className="italic">And {q.question_variants.length - 2} more variants...</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                                                    <button 
                                                        onClick={() => openAnswerModal(q)}
                                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-md transition-transform transform hover:-translate-y-0.5 whitespace-nowrap"
                                                    >
                                                        Generate Answer
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!unit.questions || unit.questions.length === 0) && (
                                        <p className="text-gray-500 italic p-4 text-center">No classified questions found in this unit.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Answer Modal - taking full screen presence */}
            <AnimatePresence>
                {selectedQuestion && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-gray-900/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-5xl h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900">{selectedQuestion.topic}</h3>
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">Unit Answer</span>
                                    </div>
                                    <p className="text-sm md:text-base text-gray-600 mt-2 break-words">{selectedQuestion.question_variants[0]}</p>
                                </div>
                                <button onClick={closeAnswerModal} className="p-2 ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                                {!generatedAnswer ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-md mx-auto text-center">
                                        <div className="w-full">
                                            <label className="block text-base font-semibold text-gray-700 mb-4">Answer Length (Marks)</label>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {[4, 6, 8, 10].map(m => (
                                                    <button 
                                                        key={m}
                                                        onClick={() => setSelectedMarks(m)}
                                                        className={`px-5 py-3 rounded-lg font-bold border-2 transition-all ${selectedMarks === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 ring-offset-2' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                                                    >
                                                        {m} Marks
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={handleGenerateAnswer}
                                            disabled={isGenerating}
                                            className="w-full py-5 px-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-xl font-bold text-xl transition-all transform hover:-translate-y-1 flex items-center justify-center"
                                        >
                                            {isGenerating ? (
                                                <span className="flex items-center gap-3">
                                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Generating Awesome Answer...
                                                </span>
                                            ) : "Generate Structured Answer"}
                                        </button>
                                        
                                        <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            {notesFile ? 
                                                <span className="text-emerald-600 font-semibold">Will use attached teacher notes ({notesFile.name}) for context.</span> : 
                                                "Answers are generated utilizing the general knowledge database. Providing teacher notes yields better results."
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="prose prose-lg prose-indigo max-w-none prose-h3:text-indigo-800 prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 mx-auto">
                                        <ReactMarkdown>{generatedAnswer.answer}</ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {generatedAnswer && (
                                <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-end items-center gap-3 md:gap-4">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(generatedAnswer.answer)}
                                        className="w-full md:w-auto px-6 py-3 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-xl shadow-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy Text
                                    </button>
                                    <div className="w-full md:w-auto">
                                        <ExportButton
                                            content={{ question: selectedQuestion.question_variants[0], answer: generatedAnswer.answer }}
                                            contentType="qa"
                                            suggestedTitle={`${selectedQuestion.topic} - Answer`}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
