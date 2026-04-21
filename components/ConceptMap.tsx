import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';
import { generateConceptMap, ConceptMapResponse, ConceptMapNode } from '../services/backendClient';

interface ConceptMapProps {
    context: string;
    onNodeClick: (topic: string) => void;
}

const TreeNode: React.FC<{ node: ConceptMapNode; onNodeClick: (topic: string) => void; defaultExpanded?: boolean }> = ({ node, onNodeClick, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="ml-4 mt-2 animate-fade-in-up">
            <div 
                className={`flex items-start p-3 rounded-xl border transition-all cursor-pointer ${expanded ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-indigo-300 hover:shadow-sm'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) setExpanded(!expanded);
                    else onNodeClick(node.label);
                }}
            >
                {hasChildren && (
                    <button 
                        className="mr-2 mt-0.5 text-gray-500 hover:text-indigo-600 focus:outline-none transition-transform"
                        style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                        ▶
                    </button>
                )}
                {!hasChildren && (
                    <span className="mr-2 mt-0.5 text-indigo-400">📄</span>
                )}
                
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">{node.label}</span>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onNodeClick(node.label);
                            }}
                            className="text-xs bg-white border border-gray-200 hover:bg-brand-primary hover:text-white hover:border-brand-primary text-gray-600 px-2.5 py-1 rounded-full transition-colors shadow-sm ml-4"
                        >
                            Explain
                        </button>
                    </div>
                    {node.summary && (
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{node.summary}</p>
                    )}
                </div>
            </div>
            {expanded && hasChildren && (
                <div className="border-l-2 border-indigo-100 ml-3 pl-1 mb-2">
                    {node.children!.map((child, idx) => (
                        <TreeNode key={idx} node={child} onNodeClick={onNodeClick} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const ConceptMap: React.FC<ConceptMapProps> = ({ context, onNodeClick }) => {
    const [data, setData] = useState<ConceptMapResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!context) return;
        
        let isMounted = true;

        const loadMap = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const mapData = await generateConceptMap(context);
                if (isMounted) setData(mapData);
            } catch (err: any) {
                console.error(err);
                if (isMounted) setError(err.message || 'Failed to generate concept map.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadMap();

        return () => {
            isMounted = false;
        };
    }, [context]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-4 py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <p className="text-gray-500 font-medium tracking-wide">Extracting conceptual structure...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-700 bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm">
                <p className="font-semibold mb-2">Error loading concept map</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    if (!data) return <div className="text-gray-500 text-center py-10">Preparing concept map...</div>;

    return (
        <div className="h-full overflow-y-auto pr-2 pb-10">
            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-inner border border-white/50">
                <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-indigo-100 text-brand-primary rounded-xl flex items-center justify-center mr-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">{data.title}</h3>
                        <p className="text-sm text-gray-500">Interactive Concept Tree</p>
                    </div>
                </div>
                
                <div className="pl-2 border-l-[3px] border-indigo-200/50 ml-4 py-2">
                    {data.children.map((child, idx) => (
                        <TreeNode key={idx} node={child} onNodeClick={onNodeClick} defaultExpanded={idx === 0} />
                    ))}
                </div>
            </div>
        </div>
    );
};
