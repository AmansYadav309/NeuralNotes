
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PdfUploader } from './components/PdfUploader';
import { PdfViewer } from './components/PdfViewer';
import { SummaryPanel } from './components/SummaryPanel';
import { DoubtPanel } from './components/DoubtPanel';
import { ConceptMap } from './components/ConceptMap';
import Quiz, { QuizQuestion } from './components/Quiz';
import Flashcard, { FlashcardData } from './components/Flashcard';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { extractTextFromPage, extractTextFromAllPages } from './services/pdfService';
import { summarizePageWithContext, createVectorStore } from './services/langchainService';
import { uploadPdf, summarize as summarizeApi, tts as ttsApi, doubt as doubtApi, doubtGeneral, summarizeYoutube, summarizeVideo as summarizeVideoApi, generateQuiz, generateFlashcards } from './services/backendClient';
import type { PDFDocumentProxy } from './types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './src/firebase';
import { HistorySidebar, SessionData } from './components/HistorySidebar';
import { QuestionAnalyzer } from './components/QuestionAnalyzer';

declare const pdfjsLib: any;

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const saveSessionToFirebase = async (title: string, contentType: 'summary' | 'qa' | 'quiz' | 'flashcards' | 'diagram', content: any) => {
        if (!user) return;
        try {
            const pdfName = file ? file.name : processedYoutubeUrl ? 'YouTube Video' : processedVideoFile ? processedVideoFile.name : 'Document';
            await addDoc(collection(db, `users/${user.uid}/sessions`), {
                title,
                pdf_name: pdfName,
                content_type: contentType,
                content,
                created_at: Date.now()
            });
        } catch (error) {
            console.error("Error saving session: ", error);
        }
    };

    // Input Mode
    const [inputType, setInputType] = useState<'pdf' | 'youtube' | 'video' | 'analyzer'>('pdf');
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');

    // Processed Media State
    const [file, setFile] = useState(null as File | null);
    const [pdfDoc, setPdfDoc] = useState(null as PDFDocumentProxy | null);

    const [processedYoutubeUrl, setProcessedYoutubeUrl] = useState<string | null>(null);
    const [processedVideoFile, setProcessedVideoFile] = useState<File | null>(null);

    const [currentPage, setCurrentPage] = useState(1);

    // State for summaries and TTS
    const [summaries, setSummaries] = useState<any[]>([]);
    const [audioSrcs, setAudioSrcs] = useState([] as (string | null)[]);
    const [currentAudioSrc, setCurrentAudioSrc] = useState(null as string | null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Loading and error states
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summarizationProgress, setSummarizationProgress] = useState(0);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [error, setError] = useState(null as string | null);

    // LangChain and Q&A state
    const [vectorStore, setVectorStore] = useState(null as any | null);

    // Quiz and Flashcard State
    const [activeFeatureTab, setActiveFeatureTab] = useState<'summary' | 'concept-map' | 'doubt' | 'quiz' | 'flashcards'>('summary');
    const [doubtInitialQuestion, setDoubtInitialQuestion] = useState<string | undefined>(undefined);
    const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [flashcardData, setFlashcardData] = useState<FlashcardData[] | null>(null);
    const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

    // User preferences
    const [isEli5, setIsEli5] = useState(false);
    const [summaryFormat, setSummaryFormat] = useState<'paragraph' | 'bullets' | 'mindmap' | 'flashcards' | 'mixed'>('paragraph');

    const audioRef = useRef(null as HTMLAudioElement | null);
    const viewerContainerRef = useRef(null as HTMLDivElement | null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAutoPlayMode, setIsAutoPlayMode] = useState(false);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audioEl.addEventListener('play', handlePlay);
        audioEl.addEventListener('pause', handlePause);
        audioEl.addEventListener('ended', handleEnded);

        return () => {
            audioEl.removeEventListener('play', handlePlay);
            audioEl.removeEventListener('pause', handlePause);
            audioEl.removeEventListener('ended', handleEnded);
        };
    }, []);

    // Track fullscreen changes and stop autoplay when exiting
    useEffect(() => {
        const onFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (!fs) {
                setIsAutoPlayMode(false);
                audioRef.current?.pause();
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    useEffect(() => {
        if (file) {
            localStorage.setItem(`neuralnotes-page-${file.name}`, String(currentPage));
        }
    }, [currentPage, file]);

    useEffect(() => {
        // Load cached summary immediately when page changes
        if (!file || !pdfDoc) return;
        const cacheKey = `ssum:${file.name}:${currentPage}:${isEli5 ? 'eli5' : 'std'}:${summaryFormat}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const updated = [...summaries];
            try {
                updated[currentPage - 1] = summaryFormat === 'flashcards' ? JSON.parse(cached) : cached;
            } catch (e) {
                updated[currentPage - 1] = cached;
            }
            setSummaries(updated);
        } else {
            // Clear current page summary if no cache
            const updated = [...summaries];
            updated[currentPage - 1] = null;
            setSummaries(updated);
        }
    }, [currentPage, file, pdfDoc, isEli5, summaryFormat]);

    const resetState = () => {
        setFile(null);
        setPdfDoc(null);
        setProcessedYoutubeUrl(null);
        setProcessedVideoFile(null);
        setCurrentPage(1);
        setSummaries([]);
        setAudioSrcs([]);
        setCurrentAudioSrc(null);
        setError(null);
        setIsPreparing(false);
        setIsSummarizing(false);
        setSummarizationProgress(0);
        setError(null);
        setVectorStore(null);
        setActiveFeatureTab('summary');
        setDoubtInitialQuestion(undefined);
        setQuizData(null);
        setFlashcardData(null);
    };

    const handleRestoreSession = useCallback((session: SessionData) => {
        resetState();
        setIsSidebarOpen(false);
        setActiveFeatureTab(session.content_type === 'qa' ? 'doubt' : session.content_type);
        setFile(new File([], session.pdf_name)); // Dummy file just to show the title
        
        if (session.content_type === 'summary') {
            setSummaries([session.content]);
        } else if (session.content_type === 'quiz') {
            setQuizData(session.content);
        } else if (session.content_type === 'flashcards') {
            setFlashcardData(session.content);
        } else if (session.content_type === 'qa') {
            // we'd need a specific flow to restore qa, or just prompt them to see it in doubtpanel
        } else if (session.content_type === 'diagram') {
            // diagram restore handled later
        }
    }, [resetState]);

    const handleFileChange = useCallback(async (selectedFile: File | null) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsPreparing(true);
        setError(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);

            const savedPage = localStorage.getItem(`neuralnotes-page-${selectedFile.name}`);
            if (savedPage && parseInt(savedPage, 10) <= pdf.numPages) {
                setCurrentPage(parseInt(savedPage, 10));
            }

            // Use backend page texts for consistency (and future server-side extraction)
            try {
                const uploaded = await uploadPdf(selectedFile);
                const store = await createVectorStore(uploaded.pages);
                setVectorStore(store);
            } catch (e) {
                const allText = await extractTextFromAllPages(pdf);
                const store = await createVectorStore(allText);
                setVectorStore(store);
            }

        } catch (err) {
            setError('Failed to load and process PDF. The file might be corrupted or unsupported.');
            console.error(err);
        } finally {
            setIsPreparing(false);
        }
    }, []);

    const handleYoutubeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!youtubeUrlInput.trim()) return;

        resetState();
        setProcessedYoutubeUrl(youtubeUrlInput.trim());
        setIsSummarizing(true);
        setError(null);

        try {
            setSummarizationProgress(50);
            const { summary, transcript } = await summarizeYoutube(youtubeUrlInput.trim(), isEli5, summaryFormat);
            setSummaries([summary]);
            const store = await createVectorStore([transcript]);
            setVectorStore(store);
            setSummarizationProgress(100);
            saveSessionToFirebase('YouTube Summary', 'summary', summary);
        } catch (err: any) {
            setError(`Failed to process YouTube video: ${err.message || err}`);
            console.error(err);
            setProcessedYoutubeUrl(null); // Reset on hard failure so they can try again
        } finally {
            setIsSummarizing(false);
            setSummarizationProgress(0);
        }
    };

    const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        resetState();
        setProcessedVideoFile(selectedFile);
        setIsSummarizing(true);
        setError(null);

        try {
            setSummarizationProgress(50);
            const { summary, transcript } = await summarizeVideoApi(selectedFile, isEli5, summaryFormat);
            setSummaries([summary]);
            const store = await createVectorStore([transcript]);
            setVectorStore(store);
            setSummarizationProgress(100);
            saveSessionToFirebase('Video Summary', 'summary', summary);
        } catch (err: any) {
            setError(`Failed to process video file: ${err.message || err}`);
            console.error(err);
            setProcessedVideoFile(null);
        } finally {
            setIsSummarizing(false);
            setSummarizationProgress(0);
        }
    };

    const handleSummarizeDocument = useCallback(async () => {
        if (!pdfDoc && !vectorStore) return;

        setIsSummarizing(true);
        setError(null);

        if (pdfDoc) {
            setSummaries([]);
            setAudioSrcs([]);
            const newSummaries = new Array(pdfDoc.numPages).fill('');
            const newAudioSrcs = new Array(pdfDoc.numPages).fill(null);

            try {
                const allPagesText: string[] = [];
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const text = await extractTextFromPage(pdfDoc, i);
                    allPagesText.push(text);
                }

                const fullText = allPagesText.join('\n\n');
                setSummarizationProgress(50);

                const generatedSummary = await summarizeApi(fullText, 0, summaryFormat, isEli5);

                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    newSummaries[i - 1] = generatedSummary;
                    const cacheKey = `ssum:${file?.name || 'unknown'}:${i}:${isEli5 ? 'eli5' : 'std'}:${summaryFormat}`;
                    localStorage.setItem(cacheKey, typeof generatedSummary === 'string' ? generatedSummary : JSON.stringify(generatedSummary));
                }

                setSummaries([...newSummaries]);
                setSummarizationProgress(100);
                saveSessionToFirebase(`Summary - Page ${currentPage}`, 'summary', generatedSummary);
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(`Failed to generate summaries: ${msg}`);
                console.error(err);
            }
        } else if (vectorStore) {
            try {
                setSummarizationProgress(50);
                const generatedSummary = await summarizeApi(vectorStore, 0, summaryFormat, isEli5);
                setSummaries([generatedSummary]);
                setSummarizationProgress(100);
                saveSessionToFirebase('Document Summary', 'summary', generatedSummary);
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(`Failed to generate summary: ${msg}`);
                console.error(err);
            }
        }

        setIsSummarizing(false);
        setSummarizationProgress(0);
    }, [pdfDoc, isEli5, summaryFormat, vectorStore, file]);

    const handleListen = useCallback(async () => {
        const summary = summaries[currentPage - 1];
        if (!summary || typeof summary !== 'string') return;

        if (isPlaying && currentAudioSrc === audioSrcs[currentPage - 1]) {
            audioRef.current?.pause();
            return;
        }

        // Check cache first
        const audioKey = `saud:${file?.name || 'unknown'}:${currentPage}`;
        const cachedAudio = localStorage.getItem(audioKey);
        if (cachedAudio) {
            const [mime, base64] = cachedAudio.split(',', 2);
            const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime || 'audio/wav' }));
            const newAudioSrcs = [...audioSrcs];
            newAudioSrcs[currentPage - 1] = url;
            setAudioSrcs(newAudioSrcs);
            setCurrentAudioSrc(url);
            return;
        }

        if (audioSrcs[currentPage - 1]) {
            setCurrentAudioSrc(audioSrcs[currentPage - 1]);
            return;
        }

        setIsLoadingAudio(true);
        setError(null);

        try {
            const audioUrl = await ttsApi(summary);
            const newAudioSrcs = [...audioSrcs];
            newAudioSrcs[currentPage - 1] = audioUrl;
            setAudioSrcs(newAudioSrcs);
            setCurrentAudioSrc(audioUrl);
        } catch (err) {
            setError('Failed to generate audio. Please try again.');
            console.error(err);
        } finally {
            setIsLoadingAudio(false);
        }
    }, [summaries, audioSrcs, currentPage, isPlaying, currentAudioSrc]);

    const handleAnswerDoubt = useCallback(async (question: string) => {
        if (!vectorStore) {
            throw new Error("Document not ready for Q&A.");
        }
        // vectorStore is now the full compiled context string
        const response = await doubtApi(question, vectorStore);
        saveSessionToFirebase(`Q&A: ${question.substring(0, 20)}...`, 'qa', { question, ...response });
        return response;
    }, [vectorStore, user, file, processedYoutubeUrl, processedVideoFile]);

    const handleAnswerGeneral = useCallback(async (question: string) => {
        return await doubtGeneral(question);
    }, []);

    const handleCitationClick = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const handleGenerateQuiz = useCallback(async () => {
        if (!vectorStore) return;
        setIsGeneratingQuiz(true);
        setError(null);
        try {
            const data = await generateQuiz(vectorStore);
            setQuizData(data.questions);
            saveSessionToFirebase('Generated Quiz', 'quiz', data.questions);
        } catch (err: any) {
            setError(`Failed to generate quiz: ${err.message || err}`);
            console.error(err);
        } finally {
            setIsGeneratingQuiz(false);
        }
    }, [vectorStore]);

    const handleGenerateFlashcards = useCallback(async () => {
        if (!vectorStore) return;
        setIsGeneratingFlashcards(true);
        setError(null);
        try {
            const data = await generateFlashcards(vectorStore);
            setFlashcardData(data.flashcards);
            saveSessionToFirebase('Generated Flashcards', 'flashcards', data.flashcards);
        } catch (err: any) {
            setError(`Failed to generate flashcards: ${err.message || err}`);
            console.error(err);
        } finally {
            setIsGeneratingFlashcards(false);
        }
    }, [vectorStore]);

    const handleGenerateDiagram = useCallback(async (diagramType: 'flowchart' | 'sequence' | 'mindmap') => {
        if (!vectorStore) throw new Error("Document not ready for Diagram Generation");
        const { generateDiagram } = await import('./services/backendClient');
        const data = await generateDiagram(vectorStore, diagramType, file?.name || 'Document');
        saveSessionToFirebase(`Diagram: ${diagramType}`, 'diagram', { mermaid_code: data.mermaid_code, diagram_type: diagramType });
        return data.mermaid_code;
    }, [vectorStore, file]);

    // Automatically trigger generation when switching to empty tabs
    useEffect(() => {
        if (activeFeatureTab === 'quiz' && !quizData && !isGeneratingQuiz) {
            handleGenerateQuiz();
        } else if (activeFeatureTab === 'flashcards' && !flashcardData && !isGeneratingFlashcards) {
            handleGenerateFlashcards();
        }
    }, [activeFeatureTab, quizData, flashcardData, isGeneratingQuiz, isGeneratingFlashcards, handleGenerateQuiz, handleGenerateFlashcards]);

    useEffect(() => {
        if (currentAudioSrc && audioRef.current) {
            audioRef.current.src = currentAudioSrc;
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        }
    }, [currentAudioSrc]);

    const exitFullscreen = async () => {
        if (document.exitFullscreen) await document.exitFullscreen();
    };

    const startFullscreenAutoplay = async () => {
        const container = viewerContainerRef.current as any;
        if (container?.requestFullscreen) {
            await container.requestFullscreen();
        }
        setIsAutoPlayMode(true);
        const audioEl = audioRef.current;
        if (!audioEl) return;
        const onEnded = async () => {
            if (!isAutoPlayMode || !pdfDoc) return;
            const next = currentPage + 1;
            if (next <= (pdfDoc?.numPages || 0)) {
                setCurrentPage(next);
                await handleListen();
            }
        };
        audioEl.onended = onEnded;
        await handleListen();
    };

    const stopAutoplay = () => {
        setIsAutoPlayMode(false);
        if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.pause();
        }
    };

    const goToNextInFullscreen = async () => {
        if (!pdfDoc) return;
        const next = currentPage + 1;
        if (next <= pdfDoc.numPages) {
            setCurrentPage(next);
            if (isFullscreen) {
                await handleListen();
            }
        }
    };

    const goToPrevInFullscreen = async () => {
        if (!pdfDoc) return;
        const prev = currentPage - 1;
        if (prev >= 1) {
            setCurrentPage(prev);
            if (isFullscreen) {
                await handleListen();
            }
        }
    };

    const togglePlayPause = async () => {
        const el = audioRef.current;
        if (!el) return;
        if (isPlaying) {
            el.pause();
        } else {
            await handleListen();
        }
    };

    // If user changes page during fullscreen autoplay, ensure audio follows
    useEffect(() => {
        if (isFullscreen && isAutoPlayMode) {
            handleListen();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, isFullscreen, isAutoPlayMode]);

    // Keyboard shortcuts in fullscreen: ←/→ for prev/next, Space for play/pause, Esc to exit
    useEffect(() => {
        if (!isFullscreen) return;
        const onKey = async (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                await goToPrevInFullscreen();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                await goToNextInFullscreen();
            } else if (e.key === ' ') {
                e.preventDefault();
                await togglePlayPause();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                await exitFullscreen();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isFullscreen, goToPrevInFullscreen, goToNextInFullscreen, togglePlayPause]);

    return (
        <div className="min-h-screen flex flex-col font-sans text-gray-800" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
            {user && (
                <HistorySidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                    user={user} 
                    onSelectSession={handleRestoreSession}
                />
            )}
            <header className="bg-white/80 backdrop-blur-md shadow-sm w-full p-4 flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-accent">
                        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7z" />
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-700">NeuralNotes</h1>
                </div>
                <div className="flex items-center">
                    {user && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="mr-3 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            History
                        </button>
                    )}
                    <button
                        onClick={resetState}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                        aria-label="Upload new PDF"
                    >
                        New Study
                    </button>
                    {!user && (
                        <button
                            onClick={async () => {
                                try {
                                    const result = await signInWithGoogle();
                                    setUser(result.user);
                                } catch (error) {
                                    console.error("Sign in failed", error);
                                }
                            }}
                            className="ml-3 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow hover:from-blue-600 hover:to-indigo-700 transition flex items-center gap-2"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </header>
            <main className="flex-grow flex flex-col p-4 lg:p-6 gap-6">
                {!file && !processedYoutubeUrl && !processedVideoFile ? (
                    <div className="w-full flex-grow flex flex-col items-center justify-start relative overflow-hidden -mx-4 -my-4 lg:-mx-6 lg:-my-6 pt-20 pb-16 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                        {/* Animated Background */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }} 
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-3xl mix-blend-multiply" 
                            />
                            <motion.div 
                                animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, 50, 0] }} 
                                transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
                                className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-3xl mix-blend-multiply" 
                            />
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, -40, 0] }} 
                                transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 4 }}
                                className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-brand-secondary/10 blur-3xl mix-blend-multiply" 
                            />
                        </div>

                        {/* Hero Content */}
                        <motion.div 
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
                            className="z-10 flex flex-col items-center text-center px-4 max-w-4xl w-full"
                        >
                            <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-accent mb-6 tracking-tight drop-shadow-sm">
                                Unlock Your Study Potential
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl leading-relaxed">
                                NeuralNotes is an AI-powered companion that turns textbooks and lectures into interactive summaries, audio, quizzes, and flashcards.
                            </p>
                        </motion.div>

                        {/* Interactive Upload Section */}
                        <motion.div 
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2, type: 'spring', bounce: 0.4 }}
                            className="z-10 w-full max-w-3xl flex flex-col items-center space-y-6 px-4"
                        >
                            {/* Tab Switcher */}
                            <div className="flex space-x-2 p-1.5 bg-white/60 backdrop-blur-md rounded-xl shadow-lg border border-white/50">
                                <button
                                    onClick={() => setInputType('pdf')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'pdf' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    PDF Document
                                </button>
                                <button
                                    onClick={() => setInputType('youtube')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'youtube' ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    YouTube Video
                                </button>
                                <button
                                    onClick={() => setInputType('video')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'video' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    Local Media
                                </button>
                                <button
                                    onClick={() => setInputType('analyzer')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'analyzer' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    Exam Analyzer
                                </button>
                            </div>

                            {/* Input Areas */}
                            <div className="w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 transform transition-all duration-500 ease-in-out hover:shadow-[0_20px_50px_rgba(99,_102,_241,_0.1)] relative overflow-hidden">
                                {!user && (
                                    <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                                        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl border border-gray-100 text-center flex flex-col items-center max-w-sm mx-4 transform transition-all hover:scale-105">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5 border border-indigo-100">
                                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to Start Learning</h3>
                                            <p className="text-gray-500 text-sm mb-6">You need an account to upload documents, generate AI summaries, and save your progress.</p>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const result = await signInWithGoogle();
                                                        setUser(result.user);
                                                    } catch (error) { console.error(error); }
                                                }}
                                                className="w-full relative flex items-center justify-center gap-3 bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow transition-all group"
                                            >
                                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                                <span>Continue with Google</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {inputType === 'pdf' && (
                                    <div className="animate-fade-in-up">
                                        <div className="text-center mb-6">
                                            <h2 className="text-2xl font-bold text-gray-800">Summarize Your Textbooks</h2>
                                            <p className="text-gray-500 mt-2">Upload a PDF to extract text, generate study guides, and chat with the document.</p>
                                        </div>
                                        <PdfUploader onFileChange={handleFileChange} />
                                    </div>
                                )}
                                {inputType === 'youtube' && (
                                    <form onSubmit={handleYoutubeSubmit} className="flex flex-col space-y-4 animate-fade-in-up">
                                        <div className="text-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Learn from YouTube</h2>
                                            <p className="text-gray-500 mt-2">Paste a URL. We'll download the audio, transcribe it, and build a study guide.</p>
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={youtubeUrlInput}
                                            onChange={(e) => setYoutubeUrlInput(e.target.value)}
                                            className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-gray-400 text-lg"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 text-lg"
                                        >
                                            Process Video
                                        </button>
                                    </form>
                                )}
                                {inputType === 'video' && (
                                    <div className="flex flex-col space-y-4 items-center animate-fade-in-up">
                                        <div className="text-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Analyze Local Media</h2>
                                            <p className="text-gray-500 mt-2">Upload a local video or audio file (.mp4, .mp3, .wav) for transcription and summary.</p>
                                        </div>
                                        <label className="w-full flex flex-col items-center px-4 py-8 bg-blue-50/50 text-blue-600 rounded-xl tracking-wide uppercase border-2 border-blue-200 border-dashed cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group">
                                            <svg className="w-10 h-10 mb-3 text-blue-400 group-hover:text-blue-500 transition-colors" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                                            </svg>
                                            <span className="mt-2 text-lg font-semibold leading-normal">Select a media file</span>
                                            <span className="text-xs text-blue-400 mt-1 normal-case">Audio or Video format</span>
                                            <input type='file' className="hidden" accept="audio/*,video/*" onChange={handleVideoFileChange} />
                                        </label>
                                    </div>
                                )}
                                {inputType === 'analyzer' && (
                                    <div className="flex flex-col space-y-4 items-center animate-fade-in-up">
                                        <div className="text-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Exam Question Paper Analyzer</h2>
                                            <p className="text-gray-500 mt-2">Upload multiple previous year question papers. AI will map questions to units and generate answers.</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setFile(new File([], 'analyzer_mode')); // hack to enter app mode
                                                setActiveFeatureTab('summary');
                                            }}
                                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            Open Analyzer Workspace
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Footer Information Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="z-10 mt-auto pt-24 pb-8 px-4 w-full max-w-6xl text-center"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-indigo-100/80 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Deep Document Analysis</h3>
                                    <p className="text-gray-600 leading-relaxed">Upload entire textbooks. Our AI uses massive context windows to understand every page, allowing for accurate Q&A without hallucination.</p>
                                </div>
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-rose-100/80 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Media Transcription</h3>
                                    <p className="text-gray-600 leading-relaxed">Give us a YouTube URL or a lecture audio file. We'll transcribe it using advanced speech-to-text and generate a comprehensive study guide.</p>
                                </div>
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-emerald-100/80 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Active Recall Tools</h3>
                                    <p className="text-gray-600 leading-relaxed">Don't just read passively. Turn your materials into dynamic Flashcards and multiple-choice Quizzes to test your knowledge.</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm tracking-wide">Powered by Gemini 2.0 Flash • Fast, Hallucination-free, Secure Media Processing</p>
                        </motion.div>
                    </div>
                ) : file?.name === 'analyzer_mode' ? (
                    <div className="w-full h-full flex mt-4">
                        <QuestionAnalyzer />
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1600px] mx-auto">
                        {/* LEFT PANEL: Media Viewer (PDF, YouTube, or Local Video) */}
                        {(file && pdfDoc) || processedYoutubeUrl || processedVideoFile ? (
                            <div ref={viewerContainerRef} className="relative flex-1 flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-4 justify-center items-center overflow-hidden">
                                {file && pdfDoc && (
                                    <PdfViewer
                                        pdfDoc={pdfDoc}
                                        currentPage={currentPage}
                                        setCurrentPage={setCurrentPage}
                                    />
                                )}
                                
                                {processedYoutubeUrl && (
                                    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                        <iframe
                                            className="w-full h-full aspect-video"
                                            src={`https://www.youtube.com/embed/${processedYoutubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/)?.[1] || ''}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}

                                {processedVideoFile && (
                                    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 border border-gray-100">
                                        {processedVideoFile.type.startsWith('video/') ? (
                                            <video
                                                controls
                                                className="w-full h-auto max-h-full rounded-md shadow-sm"
                                                src={URL.createObjectURL(processedVideoFile)}
                                            />
                                        ) : (
                                            <div className="w-full p-8 flex flex-col items-center justify-center space-y-6">
                                                <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                                </div>
                                                <div className="text-center w-full">
                                                    <p className="text-lg font-bold text-gray-800 break-all">{processedVideoFile.name}</p>
                                                    <p className="text-sm rounded-full text-indigo-600 font-semibold bg-indigo-50 px-4 py-1 inline-block mt-3 tracking-wide uppercase">Audio File</p>
                                                </div>
                                                <audio
                                                    controls
                                                    className="w-full max-w-md mt-4"
                                                    src={URL.createObjectURL(processedVideoFile)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isFullscreen && (
                                    <>
                                        <div className="absolute top-2 right-2 flex space-x-2">
                                            <button
                                                onClick={exitFullscreen}
                                                className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-800 text-white hover:bg-black"
                                            >Exit Fullscreen</button>
                                            {isAutoPlayMode ? (
                                                <button onClick={stopAutoplay} className="px-3 py-1.5 text-sm font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700">Stop Autoplay</button>
                                            ) : (
                                                <button onClick={startFullscreenAutoplay} className="px-3 py-1.5 text-sm font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700">Start Autoplay</button>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-3">
                                            <button onClick={goToPrevInFullscreen} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">Prev</button>
                                            <button onClick={togglePlayPause} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">{isPlaying ? 'Pause' : 'Play'}</button>
                                            <button onClick={goToNextInFullscreen} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">Next</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : null}

                        {/* RIGHT PANEL: Summaries, Q&A, Quizzes */}
                        <div className="flex-1 flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-6 overflow-hidden">
                            {/* Feature Tabs */}
                            <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mb-6 shrink-0 overflow-x-auto">
                                <button
                                    onClick={() => setActiveFeatureTab('summary')}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'summary' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('concept-map')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'concept-map' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Concept Map
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveFeatureTab('doubt');
                                        setDoubtInitialQuestion(undefined);
                                    }}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'doubt' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Q&A Doubt Solver
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('quiz')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'quiz' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Quiz
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('flashcards')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'flashcards' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Flashcards
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0">
                                {activeFeatureTab === 'summary' && (
                                    <div className="space-y-6">
                                        <SummaryPanel
                                            summary={summaries[currentPage - 1] || ''}
                                            isSummarizing={isSummarizing}
                                            summarizationProgress={summarizationProgress}
                                            isLoadingAudio={isLoadingAudio}
                                            isPlaying={isPlaying}
                                            error={error}
                                            onSummarize={handleSummarizeDocument}
                                            onListen={handleListen}
                                            hasDocument={!!pdfDoc || !!processedYoutubeUrl || !!processedVideoFile}
                                            hasSummaries={summaries.length > 0}
                                            isEli5={isEli5}
                                            setIsEli5={setIsEli5}
                                            isPreparing={isPreparing}
                                            summaryFormat={summaryFormat}
                                             setSummaryFormat={setSummaryFormat as any}
                                             onGenerateDiagram={handleGenerateDiagram}
                                         />
                                        {pdfDoc && (
                                            <div className="flex justify-end pr-2">
                                                <button
                                                    onClick={startFullscreenAutoplay}
                                                    disabled={!pdfDoc}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gray-800 hover:bg-black disabled:bg-gray-300"
                                                >
                                                    Fullscreen Auto-Play
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeFeatureTab === 'concept-map' && (
                                    <ConceptMap 
                                        context={vectorStore}
                                        onNodeClick={(topic) => {
                                            setDoubtInitialQuestion(`Explain ${topic}`);
                                            setActiveFeatureTab('doubt');
                                        }}
                                    />
                                )}

                                {activeFeatureTab === 'doubt' && (
                                    <DoubtPanel
                                        onAnswerDoubt={handleAnswerDoubt}
                                        onAnswerGeneral={handleAnswerGeneral}
                                        onCitationClick={handleCitationClick}
                                        isReady={!!vectorStore}
                                        initialQuestion={doubtInitialQuestion}
                                    />
                                )}

                                {activeFeatureTab === 'quiz' && (
                                    <div className="h-full">
                                        {isGeneratingQuiz ? (
                                            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                                <p className="text-gray-500">AI is crafting your quiz...</p>
                                            </div>
                                        ) : quizData ? (
                                            <Quiz questions={quizData} />
                                        ) : (
                                            <div className="text-gray-500 text-center py-10">Preparing quiz...</div>
                                        )}
                                    </div>
                                )}

                                {activeFeatureTab === 'flashcards' && (
                                    <div className="h-full">
                                        {isGeneratingFlashcards ? (
                                            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                                <p className="text-gray-500">AI is generating flashcards...</p>
                                            </div>
                                        ) : flashcardData ? (
                                            <Flashcard cards={flashcardData} />
                                        ) : (
                                            <div className="text-gray-500 text-center py-10">Preparing flashcards...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <audio ref={audioRef} />
        </div>
    );
};

export default App;
