'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Word, WrongWord } from '@/types';
import { Check, X, ArrowRight, Coins, Volume2, BookOpen, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { speakWord } from '@/lib/tts';

type Props = {
    userId: string;
    onBack: () => void;
    onTokensEarned: (tokens: number) => void;
};

export default function WrongNoteViewer({ userId, onBack, onTokensEarned }: Props) {
    const [wrongWords, setWrongWords] = useState<(WrongWord & { words: Word })[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'list' | 'study' | 'test'>('list');

    // 플래시카드 상태
    const [cardIndex, setCardIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);

    // 테스트 상태
    const [testQuestions, setTestQuestions] = useState<(WrongWord & { words: Word })[]>([]);
    const [testIndex, setTestIndex] = useState(0);
    const [testInput, setTestInput] = useState('');
    const [testStatus, setTestStatus] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
    const [testScore, setTestScore] = useState(0);
    const [correctWordIds, setCorrectWordIds] = useState<string[]>([]);
    const [isFinishing, setIsFinishing] = useState(false);

    // 오답 데이터 불러오기
    useEffect(() => {
        const fetchWrongWords = async () => {
            try {
                const { data, error } = await supabase
                    .from('wrong_words')
                    .select('*, words(*)')
                    .eq('user_id', userId)
                    .order('failed_count', { ascending: false });

                if (error) throw error;
                if (data) setWrongWords(data as any);
            } catch (error) {
                console.error('오답 노트 로딩 에러:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWrongWords();
    }, [userId]);

    // 플래시카드 학습 시작
    const startStudy = () => {
        setCardIndex(0);
        setShowMeaning(false);
        setMode('study');
    };

    // 오답 전용 테스트 시작
    const startTest = () => {
        const shuffled = [...wrongWords].sort(() => Math.random() - 0.5);
        setTestQuestions(shuffled);
        setTestIndex(0);
        setTestInput('');
        setTestStatus('playing');
        setTestScore(0);
        setCorrectWordIds([]);
        setIsFinishing(false);
        setMode('test');
    };

    // 테스트 정답 확인
    const handleTestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!testInput.trim() || testStatus !== 'playing') return;

        const currentWord = testQuestions[testIndex].words;
        const normalizedInput = testInput.trim().replace(/\s+/g, '').toLowerCase();

        // 한글 → 영어 (영어 입력) 또는 영어 → 한글 (한글 입력) 랜덤
        const m1 = currentWord.meaning_1.replace(/\s+/g, '').toLowerCase();
        const m2 = currentWord.meaning_2 ? currentWord.meaning_2.replace(/\s+/g, '').toLowerCase() : null;
        const m3 = currentWord.meaning_3 ? currentWord.meaning_3.replace(/\s+/g, '').toLowerCase() : null;
        const enWord = currentWord.word.replace(/\s+/g, '').toLowerCase();

        const isCorrect = normalizedInput === m1 || (m2 !== null && normalizedInput === m2) || (m3 !== null && normalizedInput === m3) || normalizedInput === enWord;

        if (isCorrect) {
            setTestStatus('correct');
            setTestScore(s => s + 1);
            setCorrectWordIds(prev => [...prev, testQuestions[testIndex].word_id]);
        } else {
            setTestStatus('wrong');
        }
    };

    const handleTestNext = () => {
        if (testIndex < testQuestions.length - 1) {
            setTestIndex(i => i + 1);
            setTestStatus('playing');
            setTestInput('');
        } else {
            setTestStatus('finished');
        }
    };

    // 오답 테스트 완료 처리
    const handleTestFinish = async () => {
        if (isFinishing) return;
        setIsFinishing(true);
        // 정답 3개당 1토큰
        const earnedTokens = Math.floor(testScore / 3);

        // 맞힌 단어 오답 노트에서 삭제
        if (correctWordIds.length > 0) {
            await supabase
                .from('wrong_words')
                .delete()
                .eq('user_id', userId)
                .in('word_id', correctWordIds);
        }

        // 토큰 지급
        if (earnedTokens > 0) {
            try {
                await supabase.rpc('increment_tokens', { p_user_id: userId, p_amount: earnedTokens });
            } catch (e) { console.error('Token error:', e); }
            onTokensEarned(earnedTokens);
        }

        // 목록 새로고침
        setWrongWords(prev => prev.filter(w => !correctWordIds.includes(w.word_id)));
        setMode('list');
    };

    if (loading) return <div className="text-center p-8 text-slate-500">오답 노트 불러오는 중...</div>;

    // ─── 플래시카드 모드 ───
    if (mode === 'study' && wrongWords.length > 0) {
        const currentCard = wrongWords[cardIndex];
        const isLast = cardIndex === wrongWords.length - 1;

        return (
            <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => setMode('list')} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-bold text-sm">
                        <ArrowLeft className="w-4 h-4" /> 돌아가기
                    </button>
                    <span className="text-sm font-bold text-slate-400">{cardIndex + 1} / {wrongWords.length}</span>
                </div>

                <div onClick={() => setShowMeaning(!showMeaning)}
                    className="relative w-full min-h-[280px] bg-white rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer border-2 border-red-100 shadow-xl hover:shadow-2xl transition-all">
                    <div className="absolute top-4 left-5 text-[10px] font-black tracking-widest text-slate-300 uppercase">
                        {showMeaning ? 'Meaning' : 'Wrong Word'}
                    </div>
                    <div className="absolute top-4 right-5 flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); speakWord(currentCard.words.word); }}
                            className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-500 rounded-full flex items-center justify-center transition-colors">
                            <Volume2 className="w-4 h-4" />
                        </button>
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                            ❌ {currentCard.failed_count}회 오답
                        </span>
                    </div>

                    <h2 className={`font-black tracking-tight text-3xl sm:text-5xl transition-all ${showMeaning ? 'text-slate-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500'}`}>
                        {showMeaning ? (
                            <span>
                                {currentCard.words.meaning_1}
                                {currentCard.words.meaning_2 && <span>, {currentCard.words.meaning_2}</span>}
                                {currentCard.words.meaning_3 && <span>, {currentCard.words.meaning_3}</span>}
                            </span>
                        ) : currentCard.words.word}
                    </h2>

                    <div className="absolute bottom-5 text-xs text-slate-400 font-medium">
                        {showMeaning ? '터치하면 단어로 돌아가요' : '터치하면 뜻이 보여요'}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => { setShowMeaning(false); setCardIndex(i => Math.max(0, i - 1)); }}
                        disabled={cardIndex === 0}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl disabled:opacity-30 flex items-center justify-center gap-1 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> 이전
                    </button>
                    {isLast ? (
                        <button onClick={() => setMode('list')}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 transition-colors">
                            ✅ 학습 완료
                        </button>
                    ) : (
                        <button onClick={() => { setShowMeaning(false); setCardIndex(i => i + 1); }}
                            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 transition-colors">
                            다음 <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ─── 오답 테스트 모드 ───
    if (mode === 'test' && testQuestions.length > 0) {
        if (testStatus === 'finished') {
            const earnedTokens = Math.floor(testScore / 3);
            return (
                <div className="max-w-md mx-auto text-center p-6 bg-white rounded-3xl shadow-xl border-4 border-orange-200">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📝</div>
                    <h2 className="text-2xl font-black text-orange-600 mb-2">오답 테스트 완료!</h2>
                    <p className="text-slate-600 font-medium mb-1">
                        {testQuestions.length}문제 중 <span className="font-black text-blue-600">{testScore}</span>문제 정답!
                    </p>
                    {testScore > 0 && (
                        <p className="text-xs text-emerald-600 font-bold mb-1">✅ {testScore}개 맞힌 단어가 오답 노트에서 삭제됩니다</p>
                    )}
                    <div className="bg-orange-50 text-orange-700 py-3 px-4 rounded-2xl font-bold flex items-center justify-center mt-3 mb-6 text-sm border border-orange-200">
                        <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                        오답 보너스: +{earnedTokens} 토큰 (정답 3개당 1토큰)
                    </div>
                    <button onClick={handleTestFinish}
                        disabled={isFinishing}
                        className="w-full py-3.5 text-white font-bold bg-slate-800 hover:bg-slate-700 rounded-2xl transition disabled:opacity-50">
                        {isFinishing ? '처리 중...' : '돌아가기'}
                    </button>
                </div>
            );
        }

        const currentQ = testQuestions[testIndex];
        return (
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-orange-200">
                <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-800 text-sm">오답 테스트 {testIndex + 1} / {testQuestions.length}</span>
                    </div>
                    <span className="font-bold text-yellow-600 flex items-center bg-white px-2.5 py-1 rounded-full shadow-sm text-sm">
                        <Coins className="w-3.5 h-3.5 mr-1 text-yellow-500" />{testScore}
                    </span>
                </div>
                <div className="p-5 sm:p-8 pb-6">
                    <div className="text-center mb-5">
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full mb-3">
                            이 단어의 뜻을 입력하세요
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                            {currentQ.words.word}
                        </h2>
                        <button type="button" onClick={() => speakWord(currentQ.words.word)}
                            className="mt-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full text-xs font-bold inline-flex items-center gap-1 transition-colors">
                            <Volume2 className="w-3.5 h-3.5" /> 발음 듣기
                        </button>
                    </div>

                    <form onSubmit={handleTestSubmit} className="space-y-3">
                        <input type="text" value={testInput} onChange={e => setTestInput(e.target.value)}
                            disabled={testStatus !== 'playing'} autoFocus
                            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off"
                            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                            className="w-full text-center text-xl font-bold py-3 px-4 border-4 border-slate-200 rounded-2xl focus:border-orange-400 focus:outline-none transition-colors disabled:bg-slate-50"
                            placeholder="한글 뜻 또는 영어 입력..." />

                        {testStatus === 'playing' ? (
                            <button type="submit"
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-2xl shadow-md transition-colors">
                                정답 확인!
                            </button>
                        ) : (
                            <div className={`p-4 rounded-2xl border-4 ${testStatus === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} text-center`}>
                                <div className="flex justify-center items-center mb-2">
                                    {testStatus === 'correct' ? <Check className="w-8 h-8 text-green-500" /> : <X className="w-8 h-8 text-red-500" />}
                                </div>
                                <h3 className={`text-lg font-black mb-1 ${testStatus === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                    {testStatus === 'correct' ? '정답! 👍' : '틀렸어 🥲'}
                                </h3>
                                <button type="button" onClick={() => speakWord(currentQ.words.word)}
                                    className="mx-auto mb-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full text-xs font-bold flex items-center gap-1 transition-colors">
                                    <Volume2 className="w-3.5 h-3.5" /> {currentQ.words.word} 발음 듣기
                                </button>
                                {testStatus === 'wrong' && (
                                    <p className="font-bold text-slate-700 mb-3 text-sm">
                                        정답: {[currentQ.words.meaning_1, currentQ.words.meaning_2, currentQ.words.meaning_3].filter(Boolean).join(', ')}
                                    </p>
                                )}
                                <button type="button" onClick={handleTestNext}
                                    className={`w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center text-sm ${testStatus === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} transition-colors`}>
                                    다음 문제 <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    // ─── 오답 노트 목록 화면 ───
    return (
        <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-bold text-sm">
                    <ArrowLeft className="w-4 h-4" /> Day 선택으로 돌아가기
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border-2 border-red-100 p-5 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📝</div>
                <h2 className="text-xl font-black text-slate-800 mb-1">내 오답 노트</h2>
                <p className="text-sm text-slate-500 font-medium mb-4">
                    {wrongWords.length > 0
                        ? `총 ${wrongWords.length}개의 틀린 단어가 있어요!`
                        : '아직 틀린 단어가 없어요! 완벽해요! 🎉'}
                </p>

                {wrongWords.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={startStudy}
                            className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <BookOpen className="w-5 h-5" /> 플래시카드
                        </button>
                        <button onClick={startTest}
                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                            📝 오답 테스트
                        </button>
                    </div>
                )}
            </div>

            {/* 오답 단어 목록 */}
            {wrongWords.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
                        {wrongWords.map((ww) => (
                            <div key={ww.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => speakWord(ww.words.word)}
                                        className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                                        <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{ww.words.word}</p>
                                        <p className="text-xs text-slate-500">
                                            {[ww.words.meaning_1, ww.words.meaning_2, ww.words.meaning_3].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold shrink-0">
                                    ❌ {ww.failed_count}회
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
