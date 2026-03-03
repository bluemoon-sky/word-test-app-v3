'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Word } from '@/types';
import { ChevronLeft, ChevronRight, BookOpen, Eye, Volume2, Headphones, Play } from 'lucide-react';

type Props = {
    words: Word[];
    onFinishStudy: () => void; // 학습 완료 후 콜백
    onBack: () => void; // 메인으로 돌아가기 콜백
};

// iOS/모바일 감지 (자동 TTS 불가 환경)
function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// TTS 순차 재생: 모든 utterance를 한 번에 큐에 넣어 iOS에서도 작동
function speakSequence(
    word: Word,
    onStart: () => void,
    onEnd: () => void
): () => void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd();
        return () => { };
    }

    window.speechSynthesis.cancel();
    onStart();

    const utterances: SpeechSynthesisUtterance[] = [];

    // 1순위: 영단어 (en-US)
    if (word.word) {
        const u = new SpeechSynthesisUtterance(word.word);
        u.lang = 'en-US';
        u.rate = 0.85;
        utterances.push(u);
    }

    // 짧은 무음 쉼표 (단어 사이 텀)
    const pause1 = new SpeechSynthesisUtterance(' ');
    pause1.lang = 'ko-KR';
    pause1.volume = 0;
    pause1.rate = 2;
    utterances.push(pause1);

    // 2순위: 한국어 발음 (ko-KR)
    if (word.korean_pronunciation) {
        const u = new SpeechSynthesisUtterance(word.korean_pronunciation);
        u.lang = 'ko-KR';
        u.rate = 0.9;
        utterances.push(u);

        const pause2 = new SpeechSynthesisUtterance(' ');
        pause2.lang = 'ko-KR';
        pause2.volume = 0;
        pause2.rate = 2;
        utterances.push(pause2);
    }

    // 3순위: 뜻1, 뜻2 (ko-KR)
    const meanings = [word.meaning_1, word.meaning_2].filter(Boolean);
    if (meanings.length > 0) {
        const u = new SpeechSynthesisUtterance(meanings.join(', '));
        u.lang = 'ko-KR';
        u.rate = 0.9;
        utterances.push(u);
    }

    if (utterances.length === 0) {
        onEnd();
        return () => { };
    }

    let cancelled = false;

    // 마지막 utterance의 onend에서 완료 콜백
    utterances[utterances.length - 1].onend = () => {
        if (!cancelled) onEnd();
    };
    utterances[utterances.length - 1].onerror = () => {
        if (!cancelled) onEnd();
    };

    // 모든 utterance를 한 번에 큐에 넣기 (iOS 호환)
    for (const u of utterances) {
        window.speechSynthesis.speak(u);
    }

    return () => {
        cancelled = true;
        window.speechSynthesis.cancel();
    };
}

// 학생이 단어를 카드 형태로 학습하는 컴포넌트
export default function WordStudy({ words, onFinishStudy, onBack }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);
    const [studiedCount, setStudiedCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // TTS 스킵 방지 상태
    const [isNextEnabled, setIsNextEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSkipWarning, setShowSkipWarning] = useState(false);
    const [needsManualPlay, setNeedsManualPlay] = useState(false);

    const cancelTtsRef = useRef<(() => void) | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMobileRef = useRef(false);

    // Hydration 불일치 방지 + 모바일 감지
    useEffect(() => {
        setIsMounted(true);
        isMobileRef.current = isMobileDevice();
    }, []);

    // 카드 변경 시 TTS 시작
    useEffect(() => {
        if (!isMounted || words.length === 0) return;

        // 이전 음성 취소
        if (cancelTtsRef.current) {
            cancelTtsRef.current();
            cancelTtsRef.current = null;
        }

        setIsNextEnabled(false);
        setShowSkipWarning(false);
        setIsPlaying(false);

        if (isMobileRef.current) {
            // 모바일: 수동 재생 버튼 표시
            setNeedsManualPlay(true);
        } else {
            // PC: 자동 재생
            setNeedsManualPlay(false);
            const startTimer = setTimeout(() => {
                startTts();
            }, 400);
            return () => clearTimeout(startTimer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, isMounted]);

    // 컴포넌트 언마운트 시 TTS 정지
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (cancelTtsRef.current) {
                cancelTtsRef.current();
            }
        };
    }, []);

    const startTts = useCallback(() => {
        if (cancelTtsRef.current) cancelTtsRef.current();

        const currentWord = words[currentIndex];
        setNeedsManualPlay(false);

        const cancel = speakSequence(
            currentWord,
            () => setIsPlaying(true),
            () => {
                setIsPlaying(false);
                setIsNextEnabled(true);
            }
        );
        cancelTtsRef.current = cancel;
    }, [words, currentIndex]);

    // 모바일 수동 재생 버튼 핸들러 (사용자 제스처!)
    const handleManualPlay = () => {
        startTts();
    };

    const currentWord = words[currentIndex];
    const isLast = currentIndex === words.length - 1;

    const handleNext = useCallback(() => {
        if (isLast || !isNextEnabled) return;
        if (cancelTtsRef.current) cancelTtsRef.current();
        setIsAnimating(true);
        setTimeout(() => {
            setShowMeaning(false);
            setCurrentIndex(i => i + 1);
            setStudiedCount(s => Math.max(s, currentIndex + 1));
            setIsAnimating(false);
        }, 150);
    }, [isLast, isNextEnabled, currentIndex]);

    const handlePrev = () => {
        if (currentIndex === 0) return;
        if (cancelTtsRef.current) cancelTtsRef.current();
        setIsAnimating(true);
        setTimeout(() => {
            setShowMeaning(false);
            setCurrentIndex(i => i - 1);
            setIsAnimating(false);
        }, 150);
    };

    const handleFlip = () => {
        setShowMeaning(!showMeaning);
        if (!showMeaning) {
            setStudiedCount(s => Math.max(s, currentIndex + 1));
        }
    };

    const handleSkipAttempt = () => {
        setShowSkipWarning(true);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => setShowSkipWarning(false), 2000);
    };

    const handleBack = () => {
        if (cancelTtsRef.current) cancelTtsRef.current();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        onBack();
    };

    const handleFinishStudy = () => {
        if (cancelTtsRef.current) cancelTtsRef.current();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        onFinishStudy();
    };

    const progress = Math.round(((studiedCount) / words.length) * 100);

    if (!isMounted) return null;

    return (
        <div className="max-w-md mx-auto w-full relative px-1">
            {/* 상단 네비게이션바 */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                    onClick={handleBack}
                    className="p-2 sm:p-2.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:rounded-2xl shadow-sm transition-all flex items-center gap-1.5 font-bold text-xs sm:text-sm"
                >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /> 메인으로
                </button>

                <div className="bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm text-xs sm:text-sm font-black text-indigo-600 border border-indigo-100/50">
                    {currentIndex + 1} <span className="text-indigo-300 font-medium mx-0.5 sm:mx-1">/</span> {words.length}
                </div>
            </div>

            {/* 진행도 바 */}
            <div className="bg-white/50 p-1 rounded-full mb-5 sm:mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <div className="w-full bg-slate-200/50 rounded-full h-2.5 sm:h-3 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/40 to-transparent blur-[2px]" />
                    </div>
                </div>
            </div>

            {/* TTS 상태 표시 */}
            {isPlaying && (
                <div className="flex items-center justify-center gap-2 mb-3 animate-pulse">
                    <Headphones className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-500">🎧 음성 재생 중... 잘 들어보세요!</span>
                </div>
            )}

            {/* 모바일: 수동 재생 버튼 */}
            {needsManualPlay && !isPlaying && (
                <button
                    onClick={handleManualPlay}
                    className="w-full mb-3 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-300/40 hover:shadow-xl active:scale-[0.97] transition-all animate-in fade-in zoom-in-95 duration-300"
                >
                    <Play className="w-5 h-5 fill-white" />
                    🔊 발음 듣기 (터치하세요!)
                </button>
            )}

            {/* 플래시카드 영역 */}
            <div className="perspective-1000 relative mb-5 sm:mb-8">
                <div className="absolute inset-0 bg-blue-200/50 rounded-3xl transform translate-y-3 scale-95 blur-sm" />
                <div className="absolute inset-0 bg-indigo-200/40 rounded-3xl transform translate-y-6 scale-90 blur-md" />

                <div
                    onClick={handleFlip}
                    className={`
                        relative w-full min-h-[260px] sm:min-h-[350px]
                        bg-white rounded-3xl p-6 sm:p-8 
                        flex flex-col items-center justify-center cursor-pointer select-none 
                        border-2 border-indigo-50 shadow-xl
                        transition-all duration-300 transform-gpu
                        hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-[0.97]
                        ${isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
                        ${showMeaning ? 'bg-gradient-to-br from-white to-slate-50' : 'bg-white'}
                    `}
                >
                    <div className="absolute top-4 sm:top-6 left-4 sm:left-6 text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase">
                        {showMeaning ? 'Meaning' : 'Vocabulary'}
                    </div>

                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // 수동 TTS: 영단어만 재생
                                if (typeof window !== 'undefined' && window.speechSynthesis) {
                                    window.speechSynthesis.cancel();
                                    const u = new SpeechSynthesisUtterance(currentWord.word);
                                    u.lang = 'en-US';
                                    u.rate = 0.85;
                                    window.speechSynthesis.speak(u);
                                }
                            }}
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 hover:bg-blue-200 text-blue-500 rounded-full flex items-center justify-center transition-colors"
                            title="발음 듣기"
                        >
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <span className="text-indigo-200">
                            {showMeaning ? <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" /> : <Eye className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </span>
                    </div>

                    <div className="text-center w-full mt-4">
                        <h2 className={`
                            font-black tracking-tight mb-3 sm:mb-4 transition-all duration-300
                            ${showMeaning
                                ? 'text-3xl sm:text-5xl text-slate-800'
                                : 'text-3xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600'}
                        `}>
                            {showMeaning ? (
                                <span>
                                    {currentWord.meaning_1}
                                    {currentWord.meaning_2 && <span>, {currentWord.meaning_2}</span>}
                                    {currentWord.meaning_3 && <span>, {currentWord.meaning_3}</span>}
                                </span>
                            ) : currentWord.word}
                        </h2>

                        {!showMeaning && (
                            <div className="space-y-1.5 sm:space-y-2 mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {currentWord.korean_pronunciation && (
                                    <div className="inline-block bg-blue-50 text-blue-600 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold text-base sm:text-lg shadow-sm border border-blue-100">
                                        🔊 {currentWord.korean_pronunciation}
                                    </div>
                                )}
                                {currentWord.phonetic && (
                                    <p className="text-slate-400 font-medium text-base sm:text-lg mt-1.5 sm:mt-2">[{currentWord.phonetic}]</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-4 sm:bottom-6 w-full text-center text-slate-400 text-xs sm:text-sm font-medium flex justify-center items-center gap-2 px-4">
                        <span className="animate-pulse bg-slate-200/50 px-3 py-1 rounded-full text-slate-500">
                            {showMeaning ? '한 번 더 누르면 영어가 보여요' : '뜻을 보려면 카드를 터치하세요'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 스킵 방지 경고 */}
            {showSkipWarning && (
                <div className="mb-3 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="inline-block bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-sm">
                        🎧 끝까지 들어야 다음으로 넘어갈 수 있어요!
                    </div>
                </div>
            )}

            {/* 하단 컨트롤 */}
            <div className="flex gap-3 sm:gap-4">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0 || isAnimating}
                    className="w-16 sm:w-20 h-14 sm:h-16 bg-white shadow-md shadow-slate-200/50 text-slate-500 font-bold rounded-2xl flex items-center justify-center disabled:opacity-40 disabled:scale-100 hover:scale-105 hover:text-slate-800 transition-all active:scale-95"
                >
                    <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8" />
                </button>

                {isLast ? (
                    <button
                        onClick={isNextEnabled ? handleFinishStudy : handleSkipAttempt}
                        className={`flex-1 h-14 sm:h-16 font-black text-lg sm:text-xl rounded-2xl flex items-center justify-center transition-all active:scale-95 ${isNextEnabled
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-1'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isNextEnabled ? '✨ 학습 완료! ✨' : '🎧 듣기를 완료하세요'}
                    </button>
                ) : (
                    <button
                        onClick={isNextEnabled ? handleNext : handleSkipAttempt}
                        className={`flex-1 h-14 sm:h-16 font-black text-base sm:text-lg rounded-2xl flex items-center justify-center transition-all active:scale-95 ${isNextEnabled
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isNextEnabled ? (
                            <>다음 카드 <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-1" /></>
                        ) : '🎧 듣기를 완료하세요'}
                    </button>
                )}
            </div>
        </div>
    );
}
