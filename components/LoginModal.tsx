import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle } from '../src/firebase';
import { User } from 'firebase/auth';

interface LoginModalProps {
    onLogin: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 1500); // Popup after 1.5 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            setIsLoggingIn(true);
            const result = await signInWithGoogle();
            onLogin(result.user);
            setIsVisible(false);
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            setIsLoggingIn(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 w-full max-w-sm"
                    >
                        {/* Decorative Top */}
                        <div className="h-2 bg-gradient-to-r from-brand-primary to-accent"></div>
                        
                        <div className="p-8 pb-10 flex flex-col items-center">
                            {/* Icon / Brand */}
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
                                    <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7z" />
                                </svg>
                            </div>
                            
                            <h2 className="text-2xl font-bold font-sans text-gray-800 text-center mb-2">
                                Sign in to NeuralNotes
                            </h2>
                            <p className="text-gray-500 text-center text-sm mb-8">
                                Save your summaries, chat history, and flashcards across devices automatically.
                            </p>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoggingIn}
                                className="w-full relative flex items-center justify-center gap-3 bg-white text-gray-700 py-3.5 px-6 rounded-xl font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn ? (
                                    <div className="flex space-x-1.5 items-center justify-center">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        <span>Continue with Google</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setIsVisible(false)}
                                className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
