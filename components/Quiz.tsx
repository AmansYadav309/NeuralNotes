import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { ExportButton } from './ExportButton';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface QuizProps {
  questions: QuizQuestion[];
}

const Quiz: React.FC<QuizProps> = ({ questions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(Array(questions?.length).fill(''));
  const [showResults, setShowResults] = useState(false);

  if (!questions || questions.length === 0) {
    return <div className="text-gray-500 text-center py-10">No quiz questions available.</div>;
  }

  const handleSelectOption = (option: string) => {
    if (showResults) return; // Prevent changing answer after submission
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers(Array(questions.length).fill(''));
    setShowResults(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      // Allow partial matches or exact matches ignoring case, just in case
      if (selectedAnswers[idx]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()) correct++;
    });
    return correct;
  };

  if (showResults) {
    const score = calculateScore();
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-10">
        <h2 className="text-3xl font-bold text-gray-800">Quiz Complete!</h2>
        <div className="text-6xl font-extrabold text-indigo-600 border-4 border-indigo-100 p-8 rounded-full">
          {pct}%
        </div>
        <p className="text-lg text-gray-600">You got {score} out of {questions.length} correct.</p>
        <button 
          onClick={handleRestart}
          className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-5 h-5" /> Retake Quiz
        </button>

        <div className="w-full max-w-3xl mt-12 space-y-8 animate-fade-in-up">
          <h3 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Review Your Answers</h3>
          {questions.map((q, i) => {
            const userAnswer = selectedAnswers[i];
            const isCorrect = userAnswer?.trim().toLowerCase() === q.answer?.trim().toLowerCase();
            
            return (
              <div key={i} className={`p-6 rounded-2xl border-2 transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="mt-1 flex-shrink-0">
                    {isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-rose-600" />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-2">{i + 1}. {q.question}</h4>
                    <div className="flex flex-col gap-2 text-sm md:text-base">
                      <div className="flex gap-2 items-baseline">
                        <span className="font-semibold text-gray-600 w-24">Your Answer:</span>
                        <span className={`${isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 line-through'}`}>{userAnswer || 'No answer'}</span>
                      </div>
                      {!isCorrect && (
                        <div className="flex gap-2 items-baseline mt-1">
                          <span className="font-semibold text-gray-600 w-24">Correct:</span>
                          <span className="text-emerald-700 font-bold">{q.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {q.explanation && (
                  <div className="mt-4 ml-10 p-4 bg-white/70 rounded-xl border border-gray-100 shadow-sm text-gray-700 text-sm leading-relaxed">
                    <span className="font-bold text-indigo-700 mr-2">Explanation:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== '';

  return (
    <div className="w-full mx-auto pb-8 flex flex-col items-center animate-fade-in-up">
      <div className="flex justify-between items-center w-full mb-6 px-2">
        <div className="bg-indigo-50 text-brand-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm">
          QUESTION {currentIndex + 1} OF {questions.length}
        </div>
        <ExportButton title="Quiz" contentType="quiz" content={questions} />
      </div>

      <div className="w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 sm:p-10 mb-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100">
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-10 leading-relaxed tracking-tight">
          {currentQ.question}
        </h3>
        
        <div className="space-y-4">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option;
            const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left px-6 py-5 border-2 rounded-2xl transition-all duration-300 flex items-center gap-5
                  ${isSelected ? 'border-brand-primary bg-indigo-50/80 ring-4 ring-brand-primary/20 shadow-md transform scale-[1.01]' : 'border-gray-200 hover:border-indigo-300 hover:bg-white hover:shadow-sm'}
                `}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm transition-colors duration-300
                  ${isSelected ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
                `}>
                  {optionLetter}
                </div>
                <span className={`flex-1 text-lg leading-snug transition-colors duration-300 ${isSelected ? 'text-indigo-900 font-bold' : 'text-gray-700 font-medium'}`}>
                  {option}
                </span>
                {isSelected && <CheckCircle2 className="w-6 h-6 text-brand-primary shrink-0 animate-blob" />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!hasAnsweredCurrent}
        className={`w-full sm:w-auto min-w-[240px] px-8 py-4.5 rounded-2xl font-bold text-lg transition-all duration-300 transform
          ${hasAnsweredCurrent 
            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-indigo-600 hover:to-indigo-700 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
        `}
      >
        {currentIndex === questions.length - 1 ? 'Finish & View Score' : 'Next Question'}
      </button>

    </div>
  );
};

export default Quiz;
