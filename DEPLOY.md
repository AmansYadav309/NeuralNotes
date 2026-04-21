# 🚀 NeuralNotes Deployment Guide

This guide will walk you through deploying **NeuralNotes** to production.

## 🏗️ Architecture Overview
- **Frontend**: React (Vite) deployed on **Vercel**.
- **Backend**: FastAPI (Python) deployed on **Render**.

---

## 1. 🐍 Backend Deployment (Render)

### Steps:
1.  Sign in to [Render](https://render.com/).
2.  Click **New +** > **Blueprint**.
3.  Connect your GitHub repository (if you have uploaded it) OR create a **Manual Web Service**.
    - If using **Blueprint**: Render will automatically use the `render.yaml` file in the project root.
    - If using **Web Service**:
        - **Runtime**: `Python`
        - **Build Command**: `pip install -r requirements.txt`
        - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
        - **Root Directory**: `backend`
4.  **Environment Variables**: Go to the "Environment" tab in Render and add:
    - `OPENROUTER_API_KEY`: Your OpenRouter API key.
    - `FRONTEND_ORIGIN`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app`).
    - `GOOGLE_CREDENTIALS_PATH`: `./google-credentials.json` (Ensure this file is present or use a Secret File).

### 📝 Note on Secret Files
If you have a `google-credentials.json` file, you should upload it as a **Secret File** in Render rather than committing it to your git repo if it's public.

---

## 2. ⚛️ Frontend Deployment (Vercel)

### Steps:
1.  Sign in to [Vercel](https://vercel.com/).
2.  Click **Add New** > **Project**.
3.  Import your repository.
4.  **Configuration**:
    - Vercel should automatically detect **Vite**.
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
5.  **Environment Variables**:
    - Add `VITE_API_URL`: The URL of your **Render backend** (e.g., `https://neuralnotes-backend.onrender.com`).
6.  Click **Deploy**.

---

## 🔑 Required API Keys & Services

To ensure all features work, make sure you have configured the following:

- **OpenRouter**: For LLM logic (Gemini 2.0 Flash).
- **Firebase**: Update your Firebase config in the frontend code if you want to use your own database.
- **Google Search/GenAI**: If using specific Vertex AI features.
- **YouTube logic**: Ensure `FFmpeg` is available on the hosting environment (Render's Python environment usually has basic libraries, but you might need a [Render Buildpack](https://render.com/docs/native-runtimes#ffmpeg) if specific ffmpeg logic fails).

---

## 🛠️ Local Development (Reminder)
- **Frontend**: 
    ```bash
    npm install
    npm run dev
    ```
- **Backend**:
    ```bash
    cd backend
    python -m venv venv
    ./venv/Scripts/activate
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```
