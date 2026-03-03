'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Word } from '@/types';
import { ChevronLeft, ChevronRight, BookOpen, Eye, Volume2, Headphones } from 'lucide-react';

type Props = {
    words: Word[];
    testQuestionCount: number;
    onFinishStudy: (learnedWords: Word[]) => void; // 학습 완료 후 콜백
    onBack: () => void; // 메인으로 돌아가기 콜백
};

// TTS 순차 재생 헬퍼: 영단어 → 한국어 발음 → 뜻1, 뜻2
// 안드로이드 크롬 호환성을 위해 cancel/speak 타이밍 및 onend 폴백 적용
function speakSequence(
    word: Word,
    onStart: () => void,
    onEnd: () => void
): () => void {
    // 브라우저 TTS 사용 불가 시 즉시 완료
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd();
        return () => { };
    }

    onStart();

    const parts: { text: string; lang: string }[] = [];

    // 1순위: 영단어 (en-US)
    if (word.word) {
        parts.push({ text: word.word, lang: 'en-US' });
    }

    // 2순위: 한국어 발음 (ko-KR)
    if (word.korean_pronunciation) {
        parts.push({ text: word.korean_pronunciation, lang: 'ko-KR' });
    }

    // 3순위: 뜻1, 뜻2 (ko-KR)
    const meanings = [word.meaning_1, word.meaning_2].filter(Boolean);
    if (meanings.length > 0) {
        parts.push({ text: meanings.join(', '), lang: 'ko-KR' });
    }

    if (parts.length === 0) {
        onEnd();
        return () => { };
    }

    let partIndex = 0;
    let cancelled = false;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const clearFallback = () => {
        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    };

    const playNext = () => {
        if (cancelled || partIndex >= parts.length) {
            clearFallback();
            if (!cancelled) onEnd();
            return;
        }

        const { text, lang } = parts[partIndex];
        partIndex++;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;

        // onend 이벤트가 정상적으로 오면 타이머 취소 후 다음 파트로
        const handleEnd = () => {
            clearFallback();
            if (cancelled) return;
            setTimeout(() => {
                if (!cancelled) playNext();
            }, 500);
        };

        utterance.onend = handleEnd;

        utterance.onerror = () => {
            clearFallback();
            if (cancelled) return;
            setTimeout(() => {
                if (!cancelled) playNext();
            }, 300);
        };

        window.speechSynthesis.speak(utterance);

        // 안드로이드 크롬 폴백: onend가 호출되지 않을 경우를 대비
        // 텍스트 길이 기반으로 최대 대기 시간 설정 (글자당 약 200ms + 여유 3초)
        const estimatedDuration = Math.max(3000, text.length * 200 + 2000);
        fallbackTimer = setTimeout(() => {
            // onend가 아직 안 온 경우 강제로 다음 파트로
            if (!cancelled) {
                window.speechSynthesis.cancel();
                setTimeout(() => {
                    if (!cancelled) playNext();
                }, 200);
            }
        }, estimatedDuration);
    };

    playNext();

    // 취소 함수 반환
    return () => {
        cancelled = true;
        clearFallback();
        window.speechSynthesis.cancel();
    };
}

// 학생이 단어를 카드 형태로 학습하는 컴포넌트
export default function WordStudy({ words, testQuestionCount, onFinishStudy, onBack }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);
    const [studiedCount, setStudiedCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
    const [learnedWordsThisSession, setLearnedWordsThisSession] = useState<Word[]>([]);

    // TTS 스킵 방지 상태
    const [isNextEnabled, setIsNextEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    // 취소 함수 ref
    const cancelTtsRef = useRef<(() => void) | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 초기화 및 단어 셔플
    useEffect(() => {
        if (words && words.length > 0) {
            setShuffledWords([...words].sort(() => Math.random() - 0.5));
        }
        setIsMounted(true);
    }, [words]);

    // 카드 변경 시 자동 TTS 재생
    useEffect(() => {
        if (!isMounted || shuffledWords.length === 0) return;

        // 이전 음성 취소 (cancel 함수 내부에서 speechSynthesis.cancel() 호출됨)
        if (cancelTtsRef.current) {
            cancelTtsRef.current();
            cancelTtsRef.current = null;
        }

        setIsNextEnabled(false);
        setShowSkipWarning(false);

        const currentWord = shuffledWords[currentIndex];

        // 안드로이드 크롬 핵심 버그 우회:
        // cancel() 직후 speak()를 호출하면 무시되므로, cancel 후 200ms 대기
        const startTimer = setTimeout(() => {
            const cancel = speakSequence(
                currentWord,
                () => setIsPlaying(true),
                () => {
                    setIsPlaying(false);
                    setTimeout(() => setIsNextEnabled(true), 100);
                }
            );
            cancelTtsRef.current = cancel;
        }, 200);

        return () => {
            clearTimeout(startTimer);
            if (cancelTtsRef.current) {
                cancelTtsRef.current();
                cancelTtsRef.current = null;
            }
        };
    }, [currentIndex, isMounted, shuffledWords]);

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

    const currentWord = shuffledWords[currentIndex];
    const isLast = currentIndex === (shuffledWords.length > 0 ? shuffledWords.length - 1 : 0);

    const handleNext = useCallback(() => {
        if (isLast || !isNextEnabled) return;

        setLearnedWordsThisSession(prev => {
            const wordToAdd = shuffledWords[currentIndex];
            if (wordToAdd && !prev.some(w => w.id === wordToAdd.id)) {
                return [...prev, wordToAdd];
            }
            return prev;
        });

        // 음성 정지
        if (cancelTtsRef.current) cancelTtsRef.current();
        setIsAnimating(true);
        setTimeout(() => {
            setShowMeaning(false);
            setCurrentIndex(i => i + 1);
            setStudiedCount(s => Math.max(s, currentIndex + 1));
            setIsAnimating(false);
        }, 150);
    }, [isLast, isNextEnabled, currentIndex, shuffledWords]);

    const handlePrev = () => {
        if (currentIndex === 0) return;
        // 음성 정지
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

    // 스킵 시도 시 경고 표시
    const handleSkipAttempt = () => {
        setShowSkipWarning(true);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => setShowSkipWarning(false), 2000);
    };

    const handleBack = () => {
        // 뒤로가기 시 TTS 정지
        if (cancelTtsRef.current) cancelTtsRef.current();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        onBack();
    };

    const handleFinishStudy = () => {
        const wordToAdd = shuffledWords[currentIndex];
        let finalLearned = [...learnedWordsThisSession];
        if (wordToAdd && !finalLearned.some(w => w.id === wordToAdd.id)) {
            finalLearned.push(wordToAdd);
        }

        // 학습 완료 시 TTS 정지
        if (cancelTtsRef.current) cancelTtsRef.current();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        onFinishStudy(finalLearned);
    };

    const progress = Math.round(((currentIndex + 1) / (shuffledWords.length || 1)) * 100);

    // 스와이프 제스처 핸들러 (TTS 재생 중 차단)
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (isNextEnabled && !isLast) handleNext();
            else if (!isNextEnabled) handleSkipAttempt();
        },
        onSwipedRight: () => {
            if (currentIndex > 0) handlePrev();
        },
        trackMouse: false,
        trackTouch: true,
        delta: 50,
        preventScrollOnSwipe: true,
    });

    if (!isMounted) return null;
    if (shuffledWords.length === 0) return null;

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-4 md:p-8 animate-in fade-in duration-300">
            <div className="max-w-md mx-auto w-full relative px-1">
                {/* 상단 네비게이션바 (뒤로가기 포함) */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <button
                        onClick={handleBack}
                        className="p-2 sm:p-2.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:rounded-2xl shadow-sm transition-all flex items-center gap-1.5 font-bold text-xs sm:text-sm"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /> 메인으로
                    </button>

                    <div className="bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm text-xs sm:text-sm font-black text-indigo-600 border border-indigo-100/50">
                        {currentIndex + 1} <span className="text-indigo-300 font-medium mx-0.5 sm:mx-1">/</span> {shuffledWords.length}
                    </div>
                </div>

                {/* 진행도 바 */}
                <div className="bg-white/50 p-1 rounded-full mb-5 sm:mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                    <div className="w-full bg-slate-200/50 rounded-full h-2.5 sm:h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            {/* 빛나는 효과 */}
                            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/40 to-transparent blur-[2px]" />
                        </div>
                    </div>
                </div>

                {/* TTS 재생 상태 표시 */}
                {isPlaying && (
                    <div className="flex items-center justify-center gap-2 mb-3 animate-pulse">
                        <Headphones className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500">🎧 음성 재생 중... 잘 들어보세요!</span>
                    </div>
                )}

                {/* 플래시카드 영역 (3D 효과 & 애니메이션 + 스와이프) */}
                <div {...swipeHandlers} className="perspective-1000 relative mb-5 sm:mb-8">
                    {/* 배경 장식 그림자 1 */}
                    <div className="absolute inset-0 bg-blue-200/50 rounded-3xl transform translate-y-3 scale-95 blur-sm" />
                    {/* 배경 장식 그림자 2 */}
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
                        {/* 카드 타이핑 */}
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
                                        u.rate = 0.9;
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

                            {/* 영어 단어 화면에서 한국어 발음과 발음 기호 표시 */}
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

                {/* 스킵 방지 경고 메시지 */}
                {showSkipWarning && (
                    <div className="mb-3 text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="inline-block bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-sm">
                            🎧 끝까지 들어야 다음으로 넘어갈 수 있어요!
                        </div>
                    </div>
                )}

                {/* 하단 컨트롤 (이전/다음 통합) */}
                <div className={`w-full h-14 sm:h-16 flex rounded-2xl overflow-hidden shadow-lg transition-all ${!isNextEnabled
                    ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                    : 'bg-white shadow-[0_8px_20px_-6px_rgba(88,101,242,0.3)] hover:shadow-[0_12px_24px_-8px_rgba(88,101,242,0.4)] hover:-translate-y-0.5'
                    }`}>
                    {!isNextEnabled ? (
                        <button
                            onClick={handleSkipAttempt}
                            className="w-full h-full font-black text-base sm:text-lg flex items-center justify-center cursor-not-allowed transition-all"
                        >
                            🎧 듣는 중...
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0 || isAnimating}
                                className={`flex-1 flex items-center justify-center font-bold text-base sm:text-lg transition-colors
                                ${currentIndex === 0
                                        ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                        : 'text-slate-600 bg-white hover:bg-slate-50 active:bg-slate-100'}`}
                            >
                                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 mr-1" /> 이전 카드
                            </button>

                            {isLast ? (
                                <button
                                    onClick={handleFinishStudy}
                                    className="flex-1 bg-[rgb(88,101,242)] hover:bg-[rgb(71,82,196)] text-white font-black text-base sm:text-lg flex items-center justify-center transition-colors shadow-[inset_1px_0_0_rgba(255,255,255,0.2)]"
                                >
                                    ✨ 학습 완료! ✨
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    disabled={isAnimating}
                                    className="flex-1 bg-[rgb(88,101,242)] hover:bg-[rgb(71,82,196)] text-white font-black text-base sm:text-lg flex items-center justify-center transition-colors shadow-[inset_1px_0_0_rgba(255,255,255,0.2)]"
                                >
                                    다음 카드 <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
