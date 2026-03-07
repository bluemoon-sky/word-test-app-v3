'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { Word } from '@/types';
import { ChevronRight, Headphones, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

// TTS 순차 재생 헬퍼 (한국어 발음 → 뜻)
function speakSequence(
    word: Word,
    onStart: () => void,
    onEnd: () => void
): () => void {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const parts: { text: string; lang: string }[] = [];

    if (word.korean_pronunciation) {
        parts.push({ text: word.korean_pronunciation, lang: 'ko-KR' });
    }
    const meanings = [word.meaning_1, word.meaning_2, word.meaning_3].filter(Boolean).join(', ');
    if (meanings) {
        parts.push({ text: meanings, lang: 'ko-KR' });
    }

    if (parts.length === 0) { onEnd(); return () => { cancelled = true; }; }

    let currentIndex = 0;
    onStart();

    function clearFallback() {
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    }

    function playNext() {
        if (cancelled || currentIndex >= parts.length) {
            clearFallback();
            if (!cancelled) onEnd();
            return;
        }
        if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd(); return; }

        const { text, lang } = parts[currentIndex];
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = lang === 'en-US' ? 0.9 : 1.0;

        const handleEnd = () => {
            clearFallback();
            if (cancelled) return;
            currentIndex++;
            setTimeout(playNext, 200);
        };
        u.onend = handleEnd;
        u.onerror = () => { clearFallback(); if (!cancelled) { currentIndex++; setTimeout(playNext, 200); } };

        clearFallback();
        const estimatedDuration = Math.max(text.length * 200, 2000);
        fallbackTimer = setTimeout(() => { if (!cancelled) handleEnd(); }, estimatedDuration);

        window.speechSynthesis.cancel();
        setTimeout(() => { if (!cancelled) window.speechSynthesis.speak(u); }, 50);
    }

    playNext();
    return () => { cancelled = true; clearFallback(); if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); };
}

interface Props {
    words: Word[];
    onFinish: (practicedWords: Word[]) => void;
    onBack: () => void;
}

export default function ActivePractice({ words, onFinish, onBack }: Props) {
    // 단어 섞기
    const shuffledWords = useMemo(() => [...words].sort(() => Math.random() - 0.5), [words]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<'typing' | 'quiz'>('typing'); // 앞면/뒷면
    const [typingInput, setTypingInput] = useState('');
    const [typingError, setTypingError] = useState(false);
    const [quizOptions, setQuizOptions] = useState<string[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [practicedWords, setPracticedWords] = useState<Word[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const cancelTtsRef = useRef<(() => void) | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const currentWord = shuffledWords[currentIndex];
    const isLast = currentIndex === shuffledWords.length - 1;
    const progress = Math.round(((currentIndex + 1) / (shuffledWords.length || 1)) * 100);

    useEffect(() => { setIsMounted(true); }, []);

    // 카드가 바뀔 때마다 TTS 재생 (타이핑 단계에서)
    useEffect(() => {
        if (!isMounted || !currentWord || phase !== 'typing') return;

        // 영단어 TTS 재생
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(currentWord.word);
            u.lang = 'en-US';
            u.rate = 0.85;
            window.speechSynthesis.speak(u);
        }

        setTypingInput('');
        setTypingError(false);
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [currentIndex, phase, isMounted, currentWord]);

    // 3지선다 옵션 생성
    const generateQuizOptions = useCallback((correctWord: Word) => {
        const correctAnswer = correctWord.meaning_1;
        const otherMeanings = shuffledWords
            .filter(w => w.id !== correctWord.id)
            .map(w => w.meaning_1)
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

        // 오답이 부족하면 더미 추가
        while (otherMeanings.length < 2) {
            otherMeanings.push(`(알 수 없음 ${otherMeanings.length + 1})`);
        }

        const options = [correctAnswer, ...otherMeanings].sort(() => Math.random() - 0.5);
        setQuizOptions(options);
        setSelectedAnswer(null);
        setIsCorrect(null);
    }, [shuffledWords]);

    // 타이핑 체크
    const handleTypingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentWord) return;

        if (typingInput.trim().toLowerCase() === currentWord.word.toLowerCase()) {
            // 정답! 뒷면으로 전환
            setTypingError(false);
            setPhase('quiz');
            generateQuizOptions(currentWord);
        } else {
            // 오답 → 흔들기 애니메이션
            setTypingError(true);
            setTimeout(() => setTypingError(false), 600);
        }
    };

    // 3지선다 정답 체크
    const handleQuizSelect = (answer: string) => {
        if (selectedAnswer !== null) return; // 이미 선택함
        setSelectedAnswer(answer);

        const correct = answer === currentWord.meaning_1;
        setIsCorrect(correct);

        // 연습 완료 단어 추가
        if (!practicedWords.some(w => w.id === currentWord.id)) {
            setPracticedWords(prev => [...prev, currentWord]);
        }
    };

    // 다음 단어로
    const handleNext = () => {
        if (selectedAnswer === null) return; // 아직 뜻 선택 안 함

        if (isLast) {
            // 마지막 단어 완료
            const finalPracticed = [...practicedWords];
            if (!finalPracticed.some(w => w.id === currentWord.id)) {
                finalPracticed.push(currentWord);
            }
            if (cancelTtsRef.current) cancelTtsRef.current();
            if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
            onFinish(finalPracticed);
            return;
        }

        // 애니메이션 전환
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setPhase('typing');
            setTypingInput('');
            setTypingError(false);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setIsAnimating(false);
        }, 200);
    };

    // 뒤로가기
    const handleBack = () => {
        if (cancelTtsRef.current) cancelTtsRef.current();
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        onBack();
    };

    if (!isMounted) return null;
    if (shuffledWords.length === 0) return null;

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-3 sm:p-4 md:p-8 animate-in fade-in duration-300">
            <div className="max-w-md mx-auto w-full relative px-1">
                {/* 상단 네비게이션 */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <button
                        onClick={handleBack}
                        className="p-2 sm:p-2.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:rounded-2xl shadow-sm transition-all flex items-center gap-1.5 font-bold text-xs sm:text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> 메인으로
                    </button>

                    <div className="bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm text-xs sm:text-sm font-black text-emerald-600 border border-emerald-100/50">
                        {currentIndex + 1} <span className="text-emerald-300 font-medium mx-0.5 sm:mx-1">/</span> {shuffledWords.length}
                    </div>
                </div>

                {/* 진행도 바 */}
                <div className="bg-white/50 p-1 rounded-full mb-5 sm:mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                    <div className="w-full bg-slate-200/50 rounded-full h-2.5 sm:h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/40 to-transparent blur-[2px]" />
                        </div>
                    </div>
                </div>

                {/* TTS 재생 표시 (고정 높이) */}
                <div className="h-6 mb-3 flex items-center justify-center">
                    {isPlaying && (
                        <div className="flex items-center gap-2 animate-pulse">
                            <Headphones className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500">🎧 음성 재생 중... 잘 들어보세요!</span>
                        </div>
                    )}
                </div>

                {/* 연습 카드 */}
                <div className="perspective-1000 relative mb-5 sm:mb-8">
                    <div className="absolute inset-0 bg-emerald-200/50 rounded-3xl transform translate-y-3 scale-95 blur-sm" />
                    <div className="absolute inset-0 bg-teal-200/40 rounded-3xl transform translate-y-6 scale-90 blur-md" />

                    <div
                        className={`
                        relative w-full min-h-[300px] sm:min-h-[380px]
                        bg-white rounded-3xl p-6 sm:p-8 
                        flex flex-col items-center justify-center
                        border-2 shadow-xl
                        transition-all duration-300 transform-gpu
                        ${isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
                        ${phase === 'typing' ? 'border-emerald-100' : 'border-teal-100 bg-gradient-to-br from-white to-teal-50/30'}
                    `}
                    >
                        {/* 단계 표시 */}
                        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase">
                            {phase === 'typing' ? '✍️ Spelling' : '🧠 Meaning'}
                        </div>

                        {phase === 'typing' ? (
                            /* ─── 앞면: 영단어 타이핑 ─── */
                            <div className="text-center w-full mt-4">
                                <h2 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 tracking-tight mb-1 sm:mb-2 break-all px-2 pb-2 sm:pb-3 ${currentWord.word.length > 10 ? 'text-3xl sm:text-5xl' : currentWord.word.length > 7 ? 'text-4xl sm:text-6xl' : 'text-5xl sm:text-7xl'}`}>
                                    {currentWord.word}
                                </h2>

                                {currentWord.korean_pronunciation && (
                                    <div className="inline-block bg-emerald-50 text-emerald-600 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold text-base sm:text-lg shadow-sm border border-emerald-100 mb-4 sm:mb-6">
                                        [{currentWord.korean_pronunciation}]
                                    </div>
                                )}

                                <form onSubmit={handleTypingSubmit} className="mt-4 sm:mt-6 px-2">
                                    <p className="text-xs sm:text-sm font-bold text-slate-400 mb-2">👇 위 영단어를 정확히 따라 쳐 보세요!</p>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={typingInput}
                                        onChange={e => setTypingInput(e.target.value)}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        autoComplete="off"
                                        className={`
                                            w-full text-center text-xl sm:text-2xl font-black py-3 sm:py-4 px-4 rounded-2xl
                                            border-3 transition-all duration-300 outline-none
                                            ${typingError
                                                ? 'border-red-400 bg-red-50 text-red-600 animate-[shake_0.5s_ease-in-out]'
                                                : 'border-emerald-200 bg-emerald-50/50 text-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200'
                                            }
                                        `}
                                        placeholder="영단어를 입력하세요"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-3 w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-md transition-colors"
                                    >
                                        확인 ✅
                                    </button>
                                </form>
                            </div>
                        ) : (
                            /* ─── 뒷면: 뜻 3지선다 ─── */
                            <div className="text-center w-full mt-4">
                                <h2 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 tracking-tight mb-4 sm:mb-6 break-all px-2 pb-2 sm:pb-3 ${currentWord.word.length > 10 ? 'text-2xl sm:text-4xl' : currentWord.word.length > 7 ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-6xl'}`}>
                                    {currentWord.word}
                                </h2>

                                <div className="space-y-3 px-2">
                                    {quizOptions.map((option, idx) => {
                                        const isSelected = selectedAnswer === option;
                                        const isAnswer = option === currentWord.meaning_1;
                                        const showCorrect = selectedAnswer !== null && isAnswer;
                                        const showWrong = isSelected && !isCorrect;

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuizSelect(option)}
                                                disabled={selectedAnswer !== null}
                                                className={`
                                                    w-full py-3.5 sm:py-4 px-5 rounded-2xl font-bold text-base sm:text-lg
                                                    border-2 transition-all duration-300 flex items-center justify-between
                                                    ${selectedAnswer === null
                                                        ? 'bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50 active:scale-[0.97] text-slate-700'
                                                        : showCorrect
                                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                                            : showWrong
                                                                ? 'bg-red-50 border-red-400 text-red-700'
                                                                : 'bg-slate-50 border-slate-100 text-slate-300'
                                                    }
                                                `}
                                            >
                                                <span>{option}</span>
                                                {showCorrect && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />}
                                                {showWrong && <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 정답/오답 피드백 */}
                                {selectedAnswer !== null && (
                                    <div className={`mt-4 px-4 py-2 rounded-xl font-bold text-sm sm:text-base animate-in fade-in zoom-in-95 duration-300 ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {isCorrect ? '🎉 정답! 잘했어요!' : `😅 아쉬워요! 정답: ${currentWord.meaning_1}`}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 하단 컨트롤 */}
                <div className={`w-full h-14 sm:h-16 flex rounded-2xl overflow-hidden shadow-lg transition-all ${phase === 'typing' || selectedAnswer === null
                    ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                    : 'bg-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.3)]'
                    }`}>
                    {phase === 'typing' ? (
                        <div className="w-full h-full font-black text-base sm:text-lg flex items-center justify-center text-slate-400">
                            ✍️ 위에 영단어를 입력하세요
                        </div>
                    ) : selectedAnswer === null ? (
                        <div className="w-full h-full font-black text-base sm:text-lg flex items-center justify-center text-slate-400">
                            🧠 뜻을 선택하세요
                        </div>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base sm:text-lg flex items-center justify-center transition-colors"
                        >
                            {isLast ? '✨ 연습 완료!' : '다음 단어'} <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />
                        </button>
                    )}
                </div>

                {/* 연습 진행 현황 */}
                <div className="mt-3 text-center">
                    <span className="text-xs sm:text-sm font-bold text-emerald-500/70">
                        ✍️ 연습 완료: {practicedWords.length} / {shuffledWords.length}
                    </span>
                </div>
            </div>
        </div>
    );
}
