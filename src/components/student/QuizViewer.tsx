'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Word } from '@/types';
import { Check, X, ArrowRight, Coins, Star, RotateCcw } from 'lucide-react';

type Props = {
    words: Word[];
    userId: string;
    questionCount?: number;
    isReviewMode?: boolean;
    dayNumber?: number;
    onFinish: (earnedTokens: number, wrongWordIds: string[], score: number) => void;
};

type Question = {
    word: Word;
    type: 'en_to_ko' | 'ko_to_en';
};

export default function QuizViewer({ words, userId, questionCount = 30, isReviewMode = false, dayNumber = 0, onFinish }: Props) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [score, setScore] = useState(0);
    const [earnedTokens, setEarnedTokens] = useState(0);
    const [wrongWordIds, setWrongWordIds] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, Math.min(questionCount, shuffled.length));
        const newQuestions: Question[] = limited.map((w) => ({
            word: w,
            type: Math.random() > 0.5 ? 'en_to_ko' : 'ko_to_en'
        }));
        setQuestions(newQuestions);
        setIsMounted(true);
    }, [words, questionCount]);

    const currentQ = questions[currentIndex];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || status !== 'playing') return;

        let isCorrect = false;
        const normalizedInput = input.trim().replace(/\s+/g, '').toLowerCase();

        if (currentQ.type === 'en_to_ko') {
            const m1 = currentQ.word.meaning_1.replace(/\s+/g, '').toLowerCase();
            const m2 = currentQ.word.meaning_2 ? currentQ.word.meaning_2.replace(/\s+/g, '').toLowerCase() : null;
            isCorrect = normalizedInput === m1 || (m2 !== null && normalizedInput === m2);
        } else {
            isCorrect = normalizedInput === currentQ.word.word.replace(/\s+/g, '').toLowerCase();
        }

        if (isCorrect) {
            setStatus('correct');
            setScore(s => s + 1);
            setEarnedTokens(t => t + 1);
        } else {
            setStatus('wrong');
            if (!wrongWordIds.includes(currentQ.word.id)) {
                setWrongWordIds(prev => [...prev, currentQ.word.id]);
            }
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
            setStatus('playing');
            setInput('');
        } else {
            setStatus('finished');
        }
    };

    if (!isMounted || questions.length === 0) return <div className="text-center p-8">로딩 중...</div>;

    // ─── 결과 화면 (분기: 최초 통과 vs 복습) ───
    if (status === 'finished') {
        // 복습 모드: 정답 5개당 1토큰
        const displayTokens = isReviewMode ? Math.floor(score / 5) : score;

        return (
            <div className={`max-w-md w-full mx-auto text-center p-6 sm:p-8 bg-white rounded-3xl shadow-xl border-4 animate-in zoom-in-95 duration-300 ${isReviewMode ? 'border-amber-200' : 'border-emerald-200'
                }`}>
                {/* 아이콘 */}
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 ${isReviewMode ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                    {isReviewMode ? (
                        <RotateCcw className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" />
                    ) : (
                        <Star className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 fill-emerald-500" />
                    )}
                </div>

                {/* 타이틀 */}
                <h2 className={`text-2xl sm:text-3xl font-black mb-2 ${isReviewMode ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                    {isReviewMode ? '복습 완료! 🔁' : '🎉 최초 통과 축하! 🎉'}
                </h2>

                <p className="text-base sm:text-lg text-slate-600 font-medium mb-1">
                    총 <span className="font-black text-slate-800">{questions.length}</span>문제 중 <span className="font-black text-blue-600">{score}</span>문제 정답!
                </p>

                {/* 보상 안내 */}
                {isReviewMode ? (
                    <div className="mt-4 mb-6 sm:mb-8 space-y-2">
                        <div className="bg-amber-50 text-amber-700 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold flex items-center justify-center text-sm sm:text-base border border-amber-200">
                            <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-500" />
                            복습 보너스: +{displayTokens} 토큰
                        </div>
                        <p className="text-xs text-amber-500 font-medium">정답 5개당 1토큰 지급 (복습 모드)</p>
                    </div>
                ) : (
                    <div className="mt-4 mb-6 sm:mb-8 space-y-2">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold flex items-center justify-center text-sm sm:text-base border border-emerald-200">
                            <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-500 fill-yellow-500" />
                            최초 통과 보상: +{displayTokens} 토큰! 🏆
                        </div>
                        <p className="text-xs text-emerald-500 font-medium">💡 다음 Day가 해금되었어! 계속 도전해봐! 🚀</p>
                    </div>
                )}

                <button
                    onClick={() => onFinish(earnedTokens, wrongWordIds, score)}
                    className={`w-full py-3.5 sm:py-4 text-white font-bold rounded-2xl transition text-base sm:text-lg ${isReviewMode
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                >
                    돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-blue-200">
            <div className="p-4 sm:p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-800 text-sm sm:text-base">문제 {currentIndex + 1} / {questions.length}</span>
                    {isReviewMode && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">복습</span>
                    )}
                </div>
                <span className="font-bold text-yellow-600 flex items-center bg-white px-2.5 sm:px-3 py-1 rounded-full shadow-sm text-sm sm:text-base">
                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-yellow-500" />
                    {score}
                </span>
            </div>

            <div className="p-5 sm:p-8 pb-6 sm:pb-10">
                <div className="text-center mb-5 sm:mb-8">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-full mb-3 sm:mb-4">
                        {currentQ.type === 'en_to_ko' ? '다음 단어의 뜻은?' : '이 뜻을 가진 영어 단어는?'}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight">
                        {currentQ.type === 'en_to_ko' ? currentQ.word.word : (
                            <span>
                                {currentQ.word.meaning_1}
                                {currentQ.word.meaning_2 && <span className="text-xl sm:text-2xl text-slate-500 ml-2">/ {currentQ.word.meaning_2}</span>}
                            </span>
                        )}
                    </h2>
                    {currentQ.type === 'en_to_ko' && (
                        <div className="flex justify-center gap-2 mt-2">
                            {currentQ.word.phonetic && (
                                <p className="text-slate-400 font-medium text-sm sm:text-base">[{currentQ.word.phonetic}]</p>
                            )}
                            {currentQ.word.korean_pronunciation && (
                                <p className="text-slate-400 font-medium text-sm sm:text-base">{currentQ.word.korean_pronunciation}</p>
                            )}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={status !== 'playing'}
                        autoFocus
                        className="w-full text-center text-xl sm:text-2xl font-bold py-3 sm:py-4 px-4 sm:px-6 border-4 border-slate-200 rounded-2xl focus:border-blue-400 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder={currentQ.type === 'en_to_ko' ? "뜻 입력..." : "영어 입력..."}
                    />

                    {status === 'playing' ? (
                        <button type="submit"
                            className="w-full py-3 sm:py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-md transition-colors transform hover:-translate-y-0.5">
                            정답 확인!
                        </button>
                    ) : (
                        <div className={`p-4 sm:p-6 rounded-2xl border-4 ${status === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} text-center animate-in fade-in slide-in-from-bottom-2`}>
                            <div className="flex justify-center items-center mb-2">
                                {status === 'correct' ? (
                                    <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
                                ) : (
                                    <X className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                                )}
                            </div>
                            <h3 className={`text-lg sm:text-xl font-black mb-1 ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                {status === 'correct' ? '정답이야! 멋져! 👍' : '아앗! 틀렸어 🥲'}
                            </h3>
                            {status === 'wrong' && (
                                <p className="font-bold text-slate-700 mb-3 sm:mb-4 text-sm sm:text-base">
                                    정답: {currentQ.type === 'en_to_ko'
                                        ? `${currentQ.word.meaning_1}${currentQ.word.meaning_2 ? ` (또는 ${currentQ.word.meaning_2})` : ''}`
                                        : currentQ.word.word}
                                </p>
                            )}
                            <button type="button" onClick={handleNext}
                                className={`w-full py-2.5 sm:py-3 px-6 mt-1 sm:mt-2 rounded-xl font-bold text-white flex items-center justify-center text-sm sm:text-base ${status === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} transition-colors`}>
                                다음 문제 <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
