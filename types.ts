
export interface PDFPageProxy {
    getViewport: (options: { scale: number }) => { width: number; height: number; };
    render: (options: { canvasContext: CanvasRenderingContext2D; viewport: any; }) => { promise: Promise<void> };
    getTextContent: () => Promise<{ items: { str: string }[] }>;
}

export interface PDFDocumentProxy {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

export interface QuestionVariant {
    topic: string;
    core_idea: string;
    frequency: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
    question_variants: string[];
    appeared_in_papers: number[];
}

export interface UnitAnalysis {
    unit_number: number;
    unit_name: string;
    questions: QuestionVariant[];
}

export interface AnalysisResponse {
    subject_name: string;
    total_papers_analyzed: number;
    units: UnitAnalysis[];
}

export interface ExamAnswerResponse {
    question: string;
    topic: string;
    marks: number;
    answer: string;
}
