'use client';

import { useState } from 'react';
import { Word } from '@/types';
import { ChevronLeft, ChevronRight, BookOpen, Eye, EyeOff, X } from 'lucide-react';

type Props = {
    words: Word[];
    onFinishStudy: () => void; // 학습 완료 후 콜백
    onBack: () => void; // 메인으로 돌아가기 콜백
};

// 학생이 단어를 카드 형태로 학습하는 컴포넌트
export default function WordStudy({ words, onFinishStudy, onBack }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);
    const [studiedCount, setStudiedCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const currentWord = words[currentIndex];
    const isLast = currentIndex === words.length - 1;

    const handleNext = () => {
        if (isLast) return;
        triggerAnimation();
        setTimeout(() => {
            setShowMeaning(false);
            setCurrentIndex(i => i + 1);
            setStudiedCount(s => Math.max(s, currentIndex + 1));
        }, 150);
    };

    const handlePrev = () => {
        if (currentIndex === 0) return;
        triggerAnimation();
        setTimeout(() => {
            setShowMeaning(false);
            setCurrentIndex(i => i - 1);
        }, 150);
    };

    const handleFlip = () => {
        setShowMeaning(!showMeaning);
        if (!showMeaning) {
            setStudiedCount(s => Math.max(s, currentIndex + 1));
        }
    };

    const triggerAnimation = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
    };

    const progress = Math.round(((studiedCount) / words.length) * 100);

    return (
        <div className="max-w-md mx-auto w-full relative">
            {/* 상단 네비게이션바 (뒤로가기 포함) */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="p-2.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl shadow-sm transition-all flex items-center gap-2 font-bold text-sm"
                >
                    <ChevronLeft className="w-5 h-5" /> 메인으로
                </button>

                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm text-sm font-black text-indigo-600 border border-indigo-100/50">
                    {currentIndex + 1} <span className="text-indigo-300 font-medium mx-1">/</span> {words.length}
                </div>
            </div>

            {/* 진행도 바 */}
            <div className="bg-white/50 p-1 rounded-full mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* 빛나는 효과 */}
                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/40 to-transparent blur-[2px]" />
                    </div>
                </div>
            </div>

            {/* 플래시카드 영역 (3D 효과 & 애니메이션 추가) */}
            <div className="perspective-1000 relative mb-8">
                {/* 배경 장식 그림자 1 */}
                <div className="absolute inset-0 bg-blue-200/50 rounded-3xl transform translate-y-3 scale-95 blur-sm" />
                {/* 배경 장식 그림자 2 */}
                <div className="absolute inset-0 bg-indigo-200/40 rounded-3xl transform translate-y-6 scale-90 blur-md" />

                <div
                    onClick={handleFlip}
                    className={`
                        relative w-full min-h-[350px]
                        bg-white rounded-3xl p-8 
                        flex flex-col items-center justify-center cursor-pointer select-none 
                        border-2 border-indigo-50 shadow-xl
                        transition-all duration-300 transform-gpu
                        hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-[0.97]
                        ${isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
                        ${showMeaning ? 'bg-gradient-to-br from-white to-slate-50' : 'bg-white'}
                    `}
                >
                    {/* 카드 타이핑 */}
                    <div className="absolute top-6 left-6 text-xs font-black tracking-widest text-slate-300 uppercase">
                        {showMeaning ? 'Meaning' : 'Vocabulary'}
                    </div>

                    {/* 아이콘 표시 */}
                    <div className="absolute top-6 right-6 text-indigo-200">
                        {showMeaning ? <BookOpen className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </div>

                    <div className="text-center w-full mt-4">
                        <h2 className={`
                            font-black tracking-tight mb-4 transition-all duration-300
                            ${showMeaning ? 'text-5xl text-slate-800' : 'text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600'}
                        `}>
                            {showMeaning ? currentWord.meaning : currentWord.word}
                        </h2>

                        {/* 영어 단어 화면에서 한국어 발음과 발음 기호 표시 */}
                        {!showMeaning && (
                            <div className="space-y-2 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {currentWord.korean_pronunciation && (
                                    <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-bold text-lg shadow-sm border border-blue-100">
                                        🔊 {currentWord.korean_pronunciation}
                                    </div>
                                )}
                                {currentWord.pronunciation && (
                                    <p className="text-slate-400 font-medium text-lg mt-2">[{currentWord.pronunciation}]</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-6 w-full text-center text-slate-400 text-sm font-medium flex justify-center items-center gap-2">
                        <span className="animate-pulse bg-slate-200/50 px-3 py-1 rounded-full text-slate-500">
                            {showMeaning ? '한 번 더 누르면 영어가 보여요' : '뜻을 보려면 카드를 터치하세요'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 하단 컨트롤 (이전/다음) */}
            <div className="flex gap-4">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0 || isAnimating}
                    className="w-20 h-16 bg-white shadow-md shadow-slate-200/50 text-slate-500 font-bold rounded-2xl flex items-center justify-center disabled:opacity-40 disabled:scale-100 hover:scale-105 hover:text-slate-800 transition-all active:scale-95"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                {isLast ? (
                    <button
                        onClick={onFinishStudy}
                        className="flex-1 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        ✨ 학습 완료! ✨
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={isAnimating}
                        className="flex-1 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        다음 카드 <ChevronRight className="w-6 h-6 ml-1" />
                    </button>
                )}
            </div>
        </div>
    );
}
