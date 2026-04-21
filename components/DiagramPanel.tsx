import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Download, AlertTriangle } from 'lucide-react';
import { Spinner } from './Spinner';

interface DiagramPanelProps {
    mermaidCode: string;
}

export const DiagramPanel: React.FC<DiagramPanelProps> = ({ mermaidCode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif'
        });

        const renderDiagram = async () => {
            if (!containerRef.current || !mermaidCode) return;
            try {
                setError(null);
                const id = `mermaid-${Date.now()}`;
                
                // Validate first
                await mermaid.parse(mermaidCode);
                
                // Render it
                const { svg } = await mermaid.render(id, mermaidCode);
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                    setSvgContent(svg);
                }
            } catch (err: any) {
                console.error("Mermaid parsing error:", err);
                setError(err.message || "Failed to parse diagram.");
            }
        };

        renderDiagram();
    }, [mermaidCode]);

    const handleCopySvg = () => {
        if (svgContent) {
            navigator.clipboard.writeText(svgContent);
            alert('SVG copied to clipboard!');
        }
    };

    const handleExportPng = () => {
        if (!containerRef.current || !svgContent) return;
        
        const canvas = document.createElement('canvas');
        const svgElement = containerRef.current.querySelector('svg');
        if (!svgElement) return;

        const { width, height } = svgElement.getBoundingClientRect();
        canvas.width = width * 2; // high res
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const img = new Image();
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width * 2, height * 2);
            DOMURL.revokeObjectURL(url);
            const png_dataurl = canvas.toDataURL('image/png');
            
            const a = document.createElement('a');
            a.download = 'neuralnotes-diagram.png';
            a.href = png_dataurl;
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
        img.src = url;
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 animate-fade-in-up">
                <AlertTriangle className="w-10 h-10 mb-3 text-rose-500" />
                <h4 className="font-bold text-lg mb-1">Diagram generation failed</h4>
                <p className="text-sm text-center">We couldn't generate a visual diagram for this content. Please try another text or format.</p>
                <div className="mt-4 p-4 bg-white/50 rounded-xl text-xs overflow-auto max-w-full text-rose-800 border border-rose-100">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="relative group bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-inner p-6 animate-fade-in-up">
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={handleCopySvg}
                    disabled={!svgContent}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-gray-600 focus:ring-2 focus:ring-brand-primary"
                    title="Copy SVG"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={handleExportPng}
                    disabled={!svgContent}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-gray-600 focus:ring-2 focus:ring-brand-primary"
                    title="Export PNG"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex justify-center overflow-x-auto min-h-[300px] w-full items-center">
                {!svgContent && !error && <Spinner />}
                <div 
                    ref={containerRef} 
                    className="w-full flex justify-center diagram-container"
                >
                </div>
            </div>
        </div>
    );
};
