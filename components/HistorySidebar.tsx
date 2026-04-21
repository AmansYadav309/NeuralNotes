import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, logout } from '../src/firebase';
import { User } from 'firebase/auth';

export interface SessionData {
    id: string;
    title: string;
    pdf_name: string;
    content_type: 'summary' | 'qa' | 'quiz' | 'flashcards';
    content: any;
    created_at: number; // timestamp
}

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSelectSession: (session: SessionData) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, user, onSelectSession }) => {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, `users/${user.uid}/sessions`),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: SessionData[] = [];
            snapshot.forEach((docSnap) => {
                data.push({ id: docSnap.id, ...docSnap.data() } as SessionData);
            });
            setSessions(data);
        });

        return () => unsubscribe();
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, `users/${user.uid}/sessions`, id));
        } catch (error) {
            console.error("Error deleting session: ", error);
        }
    };

    const filteredSessions = useMemo(() => {
        if (!searchQuery) return sessions;
        return sessions.filter(s => 
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.pdf_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sessions, searchQuery]);

    const groupedSessions = useMemo(() => {
        const today: SessionData[] = [];
        const yesterday: SessionData[] = [];
        const earlier: SessionData[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 86400000;

        filteredSessions.forEach(session => {
            if (session.created_at >= startOfToday) {
                today.push(session);
            } else if (session.created_at >= startOfYesterday) {
                yesterday.push(session);
            } else {
                earlier.push(session);
            }
        });

        return { Today: today, Yesterday: yesterday, Earlier: earlier };
    }, [filteredSessions]);

    const renderGroup = (title: string, groupSessions: SessionData[]) => {
        if (groupSessions.length === 0) return null;
        return (
            <div className="mb-6" key={title}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{title}</h3>
                <div className="space-y-2">
                    {groupSessions.map((session) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectSession(session)}
                            className="group flex flex-col p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1 ${
                                    session.content_type === 'summary' ? 'bg-blue-100 text-blue-700' :
                                    session.content_type === 'qa' ? 'bg-purple-100 text-purple-700' :
                                    session.content_type === 'quiz' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>
                                    {session.content_type}
                                </span>
                                <button 
                                    onClick={(e) => handleDelete(e, session.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                    title="Delete session"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            <h4 className="font-semibold text-gray-800 text-sm truncate">{session.title}</h4>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{session.pdf_name}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '-100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '-100%', opacity: 0.5 }}
                        transition={{ type: "spring", stiffness: 250, damping: 30 }}
                        className="fixed top-0 left-0 h-full w-80 bg-gray-50/95 backdrop-blur-xl border-r border-gray-200 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-5 flex justify-between items-center border-b border-gray-200 bg-white">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Study History
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search history..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Sessions List */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300">
                            {filteredSessions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-70">
                                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-sm font-medium">No history found</p>
                                </div>
                            ) : (
                                <>
                                    {renderGroup("Today", groupedSessions.Today)}
                                    {renderGroup("Yesterday", groupedSessions.Yesterday)}
                                    {renderGroup("Earlier", groupedSessions.Earlier)}
                                </>
                            )}
                        </div>

                        {/* User Account / Context Info Menu Bottom */}
                        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User profile" className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{user.displayName || 'User'}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <button
                                    onClick={() => logout()}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
