'use client';

import { useState } from 'react';
import { Word } from '@/types';
import { ChevronLeft, ChevronRight, BookOpen, Eye, EyeOff } from 'lucide-react';

type Props = {
    words: Word[];
    onFinishStudy: () => void; // 학습 완료 후 콜백
};

// 학생이 단어를 카드 형태로 학습하는 컴포넌트
export default function WordStudy({ words, onFinishStudy }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);
    const [studiedCount, setStudiedCount] = useState(0);

    const currentWord = words[currentIndex];
    const isLast = currentIndex === words.length - 1;

    const handleNext = () => {
        if (isLast) return;
        setShowMeaning(false);
        setCurrentIndex(i => i + 1);
        setStudiedCount(s => Math.max(s, currentIndex + 1));
    };

    const handlePrev = () => {
        if (currentIndex === 0) return;
        setShowMeaning(false);
        setCurrentIndex(i => i - 1);
    };

    const handleFlip = () => {
        setShowMeaning(!showMeaning);
        if (!showMeaning) {
            setStudiedCount(s => Math.max(s, currentIndex + 1));
        }
    };

    const progress = Math.round(((studiedCount) / words.length) * 100);

    return (
        <div className="max-w-md mx-auto">
            {/* 진행도 헤더 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        단어 학습 중
                    </span>
                    <span className="text-sm font-bold text-indigo-600">
                        {currentIndex + 1} / {words.length}
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-indigo-400 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* 플래시카드 */}
            <div
                onClick={handleFlip}
                className="bg-white rounded-3xl shadow-xl border-4 border-indigo-200 p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer select-none transition-all hover:shadow-2xl hover:border-indigo-300 active:scale-[0.98]"
            >
                <div className="text-center">
                    <p className="text-sm font-bold text-indigo-400 mb-4">
                        {showMeaning ? '한글 뜻' : '영어 단어'}
                    </p>
                    <h2 className="text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        {showMeaning ? currentWord.meaning : currentWord.word}
                    </h2>

                    {/* 영어 단어 화면에서 한국어 발음과 발음 기호 표시 */}
                    {!showMeaning && (
                        <div className="space-y-1">
                            {currentWord.korean_pronunciation && (
                                <p className="text-lg font-bold text-blue-500">🔊 {currentWord.korean_pronunciation}</p>
                            )}
                            {currentWord.pronunciation && (
                                <p className="text-slate-400 font-medium">[{currentWord.pronunciation}]</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center gap-2 text-indigo-400 text-sm font-medium">
                    {showMeaning ? (
                        <><EyeOff className="w-4 h-4" /> 탭하면 영어 단어 보기</>
                    ) : (
                        <><Eye className="w-4 h-4" /> 탭하면 뜻 보기</>
                    )}
                </div>
            </div>

            {/* 이전/다음 버튼 */}
            <div className="flex gap-3 mt-4">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" /> 이전
                </button>

                {isLast ? (
                    <button
                        onClick={onFinishStudy}
                        className="flex-1 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:from-emerald-500 hover:to-teal-600 transition-all"
                    >
                        ✅ 학습 완료!
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex-1 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center transition-colors"
                    >
                        다음 <ChevronRight className="w-5 h-5 ml-1" />
                    </button>
                )}
            </div>
        </div>
    );
}
