// API base URL detection
// Priority (top to bottom):
// 1) VITE_API_URL (set at build/deploy time for maximum flexibility)
// 2) If running on localhost, default to local backend http://localhost:8000
// 3) Otherwise, use the deployed Render backend
const explicit = (import.meta as any)?.env?.VITE_API_URL;
const isLocal = typeof window !== 'undefined' && /^(localhost|127\.|0:0:0:0:0:0:0:1|\[::1\])$/.test(window.location.hostname);
const DEFAULT_LOCAL = 'http://localhost:8000';
// This can be set in Vercel as VITE_API_URL
const DEFAULT_PROD = 'https://neuralnotes-backend.onrender.com'; 

export const API_BASE_URL: string = explicit || (isLocal ? DEFAULT_LOCAL : DEFAULT_PROD);

export interface DoubtResponse {
  found_in_doc: boolean;
  answer: string;
  source?: {
    page: number;
    paragraph: number;
    excerpt: string;
  } | string;
}

export interface DiagramResponse {
  mermaid_code: string;
}

export interface ConceptMapNode {
  label: string;
  summary?: string;
  children?: ConceptMapNode[];
}

export interface ConceptMapResponse {
  title: string;
  children: ConceptMapNode[];
}

export async function uploadPdf(file: File): Promise<{ num_pages: number; pages: string[]; metadata: any; }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/upload_pdf`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function summarize(text: string, pageNumber: number, format: string = 'paragraph', isEli5: boolean = false): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, page_number: pageNumber, format, is_eli5: isEli5 })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.summary as string;
}

export async function tts(summary: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return `${API_BASE_URL}${data.url}`;
}

export async function doubt(question: string, context: string): Promise<DoubtResponse> {
  const res = await fetch(`${API_BASE_URL}/doubt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function doubtGeneral(question: string): Promise<DoubtResponse> {
  const res = await fetch(`${API_BASE_URL}/doubt-general`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function generateConceptMap(context: string): Promise<ConceptMapResponse> {
  const res = await fetch(`${API_BASE_URL}/concept-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function summarizeYoutube(url: string, isEli5: boolean = false, format: string = 'paragraph'): Promise<{ summary: string, transcript: string }> {
  const res = await fetch(`${API_BASE_URL}/summarize-youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, is_eli5: isEli5, format })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function summarizeVideo(file: File, isEli5: boolean = false, format: string = 'paragraph'): Promise<{ summary: string, transcript: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('is_eli5', String(isEli5));
  form.append('format', format);
  const res = await fetch(`${API_BASE_URL}/summarize-video-file`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function generateQuiz(text: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/generate-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function generateFlashcards(text: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/generate-flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function generateDiagram(content: string, diagramType: 'flowchart' | 'sequence' | 'mindmap', topic: string = "Document"): Promise<DiagramResponse> {
  const res = await fetch(`${API_BASE_URL}/generate-diagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, diagram_type: diagramType, topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function analyzePapers(files: File[]): Promise<any> {
    const form = new FormData();
    files.forEach(file => {
        form.append('files', file);
    });
    const res = await fetch(`${API_BASE_URL}/analyze-papers`, {
        method: 'POST',
        body: form
    });
    if (!res.ok) {
        const errText = await res.text();
        try {
            const parsed = JSON.parse(errText);
            throw new Error(parsed.detail || errText);
        } catch {
            throw new Error(errText);
        }
    }
    return await res.json();
}

export async function generateExamAnswer(question: string, topic: string, marks: number, notesFile: File | null): Promise<any> {
    const form = new FormData();
    form.append('question', question);
    form.append('topic', topic);
    form.append('marks', String(marks));
    if (notesFile) {
        form.append('notes_file', notesFile);
    }
    const res = await fetch(`${API_BASE_URL}/generate-exam-answer`, {
        method: 'POST',
        body: form
    });
    if (!res.ok) {
        const errText = await res.text();
        try {
            const parsed = JSON.parse(errText);
            throw new Error(parsed.detail || errText);
        } catch {
            throw new Error(errText);
        }
    }
    return await res.json();
}
