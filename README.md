# NeuralNotes 📚🧠

**NeuralNotes** is an AI-powered study companion that transforms textbooks and lecture notes into interactive summaries, audio, quizzes, flashcards, and **AI-generated diagrams**. It uses Gemini 2.0 Flash (via Vertex AI) and local vector search to provide fast, hallucination-free study tools. By leveraging advanced LLMs with massive context windows, NeuralNotes can ingest full textbooks, YouTube videos, and lectures to generate comprehensive study aids, explain complex concepts, and visualize data structures.

---

## 🌟 Key Features

### 📄 Smart Document & Media Processing
- **PDF Uploads:** Extract text natively from PDF textbooks and notes.
- **YouTube Integration:** Paste a YouTube URL to automatically download audio, transcribe it, and process the video content.
- **Local Media Support:** Upload local audio and video files (`.mp4`, `.mp3`, `.wav`) for automatic transcription and summarization.

### 🧠 AI Flowchart & Diagram Generation [NEW]
- **Visualize Concepts:** Generate Flowcharts, Sequence Diagrams, and Mind Maps directly from your study content using Mermaid.js.
- **Diagram Types:**
  - `Flowchart TD`: Perfect for process flows and step-by-step logic.
  - `Sequence Diagram`: Best for interactions and cause-and-effect chains.
  - `Mind Map`: Ideal for hierarchical topic overviews.
- **Export Diagrams:** Download your AI-generated visualizations as high-quality PNG images.

### 💾 Persistent Memory System [NEW]
- **Cloud History:** Automatically saves your summaries, chat history, quizzes, and diagrams to Firebase Firestore.
- **Left Sidebar Navigation:** Access your full study history from a sleek, searchable drawer on the left.
- **Session Restoration:** Click any past session to immediately restore your summary, quiz results, or flashcards.

### 📝 Advanced Summarization
- **Multiple Formats:** Choose between Paragraphs, Bullet Points, Mind-Map Outlines, or Flashcard summaries.
- **Explain Like I'm 5 (ELI5):** Toggle ELI5 mode to break down complex academic jargon into simple, digestible concepts.
- **Page-by-Page Breakdown:** For PDFs, summaries are generated and cached page-by-page so you can study sequentially.

### 💬 Interactive Doubt Solver (Q&A)
- A dedicated chat interface allows you to ask targeted questions about your study material. 
- Uses the full source context for highly accurate, hallucination-free reasoning.

### 🎯 Active Recall & Testing
- **AI Quiz Generation:** Automatically generate multiple-choice quizzes base on the material.
- **AI Flashcards:** Generate interactive 3D flashcards for active recall study.

### 📦 Export / Download System [NEW]
- **Multi-Format Support:** Export summaries and study guides to **PDF**, **Microsoft Word (.docx)**, and **Plain Text (.txt)**.
- **Diagram PNGs:** Save your visual concept maps directly to your device.

### ✨ Premium Interactive UI [NEW]
- **Animated Home Page:** Features smooth Framer Motion transitions and an interactive, animated gradient background.
- **Non-Blocking Auth:** Sign in with Google via a native header tab without clinical popups.
- **Minimalist Design:** Modern Glassmorphism aesthetic with responsive layouts.

---

## 🏗 Architecture & Tech Stack

### **Frontend**
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **State & Logic:** Framer Motion (Animations), Mermaid.js (Diagrams)
- **Database/Auth:** Firebase (Authentication & Firestore)
- **Styling:** Tailwind CSS + Vanilla CSS (Custom modern aesthetics)
- **PDF Handling:** `pdfjs-dist` (In-browser extraction)

### **Backend**
- **Framework:** FastAPI (Python)
- **Language:** Python 3.10+
- **AI Integration:** Google Gemini 2.0 Flash (Native endpoint)
- **Document Generation:** `fpdf2` (PDF Export), `python-docx` (Word Export)
- **Media Processing:** `yt-dlp` (YouTube downloads), `ffmpeg` (Audio extraction), `google-genai` (Audio transcription)
- **Audio Synthesis:** `gTTS` (Google Text-to-Speech)
- **Server:** `uvicorn` (ASGI Server)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- [FFmpeg](https://ffmpeg.org/)
- A **Google Cloud Project** for Vertex AI / Gemini API
- A **Firebase Project** (Enable Auth and Firestore)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/NeuralNotes.git
   cd NeuralNotes
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   # Activate venv: .\venv\Scripts\activate (Win) or source venv/bin/activate (Mac)
   pip install -r requirements.txt
   ```

3. **Backend Configuration**
   Create a `.env` file in `backend/`:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   FRONTEND_ORIGIN=http://localhost:5173
   ```

4. **Frontend Setup**
   ```bash
   npm install
   ```

5. **Run Locally**
   - Start Backend: `uvicorn main:app --reload --port 8000` (in `backend/`)
   - Start Frontend: `npm run dev`

---

## 📂 File Structure

```text
NeuralNotes/
├── backend/                  # FastAPI Application
│   ├── main.py               # Core API logic, Diagram Endpoints, Exports
│   ├── requirements.txt      # Python dependencies (fpdf2, python-docx, etc.)
│   └── uploads/              # Transient media storage
├── components/               # React UI Components
│   ├── HistorySidebar.tsx    # Left-side persistent session history
│   ├── DiagramPanel.tsx      # Mermaid.js diagram engine & export
│   ├── SummaryPanel.tsx      # Main study interface with Visualization tab
│   ├── DoubtPanel.tsx        # Q&A interface
│   └── ExportButton.tsx      # Multi-format download component
├── services/                 # API & Logic Layers
│   ├── backendClient.ts      # REST API client (now includes Diagram & Export)
│   ├── langchainService.ts   # Vector orchestration
│   └── pdfService.ts         # Browser-side PDF extraction
├── App.tsx                   # Main App Router & Hero Layout
└── package.json              # Includes mermaid, framer-motion, firebase
```

## 📝 License
This project is licensed under the MIT License.
