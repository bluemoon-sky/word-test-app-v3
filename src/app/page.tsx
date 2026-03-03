'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import WordStudy from '@/components/student/WordStudy';
import QuizViewer from '@/components/student/QuizViewer';
import WrongNoteViewer from '@/components/student/WrongNoteViewer';
import PetAvatar from '@/components/student/PetAvatar';
import DailyRoulette from '@/components/student/DailyRoulette';
import { Word, User, TestRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { Coins, LogOut, Loader2, BookOpen, Clock, CheckCircle, X, ArrowLeft, Lock, Star, Zap, Flame } from 'lucide-react';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // 학생 플로우: day_select → dashboard → study → request_sent → test → wrong_note
  const [mode, setMode] = useState<'day_select' | 'dashboard' | 'study' | 'request_sent' | 'test' | 'wrong_note'>('day_select');
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [testRequest, setTestRequest] = useState<TestRequest | null>(null);
  const [checkingRequest, setCheckingRequest] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  // 단어별 마스터 추적: { dayNumber: Set<word> }
  const [masteryMap, setMasteryMap] = useState<Record<number, Set<string>>>({});

  // 시험 요청 상태 확인
  const checkTestRequest = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('test_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setTestRequest(data as TestRequest);
      if (data.status === 'approved') {
        setStudyCompleted(true);
      }
    }
  }, []);

  // Day 카테고리에서 숫자 추출
  const extractDayNum = (cat: string): number => {
    const match = cat.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  // Day 목록 추출 (DB에 등록된 카테고리 기반)
  const dayCategories = useMemo(() => {
    const cats = new Set<string>();
    allWords.forEach(w => { if (w.category) cats.add(w.category); });
    return Array.from(cats).sort((a, b) => {
      const numA = extractDayNum(a);
      const numB = extractDayNum(b);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [allWords]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      let { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('nickname', nickname.trim())
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;

      if (!existingUser) {
        alert('등록되지 않은 이름이에요! 부모님이나 선생님께 여쭤보세요.');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      let finalUser = existingUser as User;

      if (existingUser.last_earn_date !== today) {
        const { data: updatedUser, error: resetError } = await supabase
          .from('users')
          .update({ daily_earned_tokens: 0, last_earn_date: today })
          .eq('id', existingUser.id)
          .select()
          .single();
        if (!resetError && updatedUser) finalUser = updatedUser as User;
      }

      setUser(finalUser);

      // 일일 보물상자 체크
      if (finalUser.last_roulette_date !== today) {
        setTimeout(() => setShowRoulette(true), 800);
      }

      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${existingUser.id}`);
      if (wordsError) throw wordsError;

      setAllWords(wordsData as Word[]);

      // 마스터리 데이터 로드
      const { data: masteryData } = await supabase
        .from('user_word_mastery')
        .select('day_number, word')
        .eq('user_id', existingUser.id)
        .eq('is_mastered', true);

      if (masteryData) {
        const mMap: Record<number, Set<string>> = {};
        masteryData.forEach((m: { day_number: number; word: string }) => {
          if (!mMap[m.day_number]) mMap[m.day_number] = new Set();
          mMap[m.day_number].add(m.word);
        });
        setMasteryMap(mMap);
      }

      setMode('day_select');
      await checkTestRequest(existingUser.id);

    } catch (error) {
      console.error('Error logging in:', error);
      alert('접속 중 오류가 발생했어요. 다시 시도해 주세요!');
    } finally {
      setLoading(false);
    }
  };

  // Day 선택 핸들러
  const handleSelectDay = (day: string) => {
    if (!user) return;
    const dayNum = extractDayNum(day);
    const unlockedDay = user.current_unlocked_day || 1;

    // 잠긴 Day는 클릭 불가
    if (dayNum > unlockedDay) return;

    const review = dayNum < unlockedDay;

    setSelectedDay(day);
    setSelectedDayNum(dayNum);
    setIsReviewMode(review);

    const dayWords = allWords.filter(w => w.category === day);

    if (user.last_wrong_word_ids && user.last_wrong_word_ids.length > 0) {
      const wrongIds = new Set(user.last_wrong_word_ids);
      dayWords.sort((a, b) => {
        const aW = wrongIds.has(a.id) ? 0 : 1;
        const bW = wrongIds.has(b.id) ? 0 : 1;
        return aW - bW;
      });
    }

    // 스마트 출제: 미마스터 단어 우선 정렬
    const masteredSet = masteryMap[dayNum] || new Set<string>();
    if (!review) {
      // 최초 학습 모드일 때: 미마스터 단어를 앞으로 정렬
      dayWords.sort((a, b) => {
        const aM = masteredSet.has(a.word) ? 1 : 0;
        const bM = masteredSet.has(b.word) ? 1 : 0;
        return aM - bM;
      });
    }

    // 학습 단어 수 제한 적용
    const studyLimit = user.study_word_count || 20;
    setWords(dayWords.slice(0, studyLimit));
    setStudyCompleted(false);
    setTestRequest(null);

    setMode('dashboard');
    if (user) checkTestRequest(user.id);
  };

  // 시험 요청 보내기
  const handleRequestTest = async () => {
    if (!user) return;
    try {
      if (testRequest && testRequest.status === 'pending') { setMode('request_sent'); return; }

      const { data, error } = await supabase
        .from('test_requests')
        .insert([{ user_id: user.id, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      setTestRequest(data as TestRequest);
      setMode('request_sent');
    } catch (error) {
      console.error('Error requesting test:', error);
      alert('시험 요청 중 오류가 발생했어요.');
    }
  };

  const handleRefreshStatus = async () => {
    if (!user) return;
    setCheckingRequest(true);
    await checkTestRequest(user.id);
    setCheckingRequest(false);
  };

  const handleExchange = async () => {
    if (!user || (user.tokens ?? 0) < 100) {
      alert('정산은 최소 1,000원(100 토큰) 단위부터 가능합니다!');
      return;
    }
    const safeTokens = user.tokens ?? 0;
    const exchangeableTokens = Math.floor(safeTokens / 100) * 100;
    const amount = exchangeableTokens * 10;
    if (!window.confirm(`현재 ${exchangeableTokens} 토큰을 용돈 ${amount.toLocaleString()}원으로 교환 신청할까요?`)) return;

    try {
      await supabase.from('exchange_requests').insert([{ user_id: user.id, tokens_deducted: exchangeableTokens, amount, status: 'pending' }]);
      const { data: updatedUser } = await supabase.from('users').update({ tokens: user.tokens - exchangeableTokens }).eq('id', user.id).select().single();
      if (updatedUser) setUser(updatedUser as User);
      alert('용돈 교환 신청이 완료되었어요!');
    } catch (error) {
      console.error('Error exchanging tokens:', error);
      alert('교환 신청 중 오류가 발생했어요.');
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) setUser(data as User);
  };

  // === 토큰 모달 컴포넌트 ===
  const TokenModal = () => {
    if (!showTokenModal || !user) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setShowTokenModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"><X className="w-6 h-6" /></button>
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💰</div>
          <h2 className="text-xl sm:text-2xl font-black text-center text-slate-800 mb-6">용돈 지갑</h2>
          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-slate-600 text-sm">오늘 획득한 토큰</span>
              <span className="font-black text-slate-800">{user.daily_earned_tokens || 0} / 20개</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-slate-600 text-sm">보유 중인 총 토큰</span>
              <span className="font-black text-yellow-600 text-lg">{(user.tokens ?? 0).toLocaleString()}개</span>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg shadow-teal-500/20">
              <span className="font-bold text-teal-50 text-sm">현재 환전 가능 총액</span>
              <span className="font-black text-xl">₩ {((user.tokens ?? 0) * 10).toLocaleString()}</span>
            </div>
            <p className="text-center text-xs font-bold text-slate-400 bg-slate-50 py-1.5 rounded-full">⚠️ 1,000원 단위로만 정산 가능해요!</p>
          </div>
          <button onClick={() => { setShowTokenModal(false); handleExchange(); }} disabled={user.tokens < 100}
            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg rounded-2xl shadow-md transition-all disabled:opacity-50 flex justify-center items-center">
            1,000원 단위로 정산 신청하기
          </button>
        </div>
      </div>
    );
  };

  // ─── 로그인 화면 ───
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col p-4 text-center">
        <div className="m-auto max-w-md w-full bg-white rounded-3xl shadow-xl border-4 border-blue-200 p-6 sm:p-8 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner text-3xl sm:text-4xl">🚀</div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">영단어 마스터!</h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mb-6 sm:mb-8">내 이름을 입력하고 단어 시험을 시작해 봐!</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="여기에 이름 입력..."
              className="w-full text-center text-lg sm:text-xl font-bold py-3 sm:py-4 px-4 sm:px-6 bg-slate-50 border-4 border-slate-200 rounded-2xl focus:border-blue-400 focus:bg-white focus:outline-none transition-all" required />
            <button type="submit" disabled={loading}
              className="w-full py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '접속하기!'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <a href="/admin" className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"><LogOut className="w-4 h-4" /> 관리자 메뉴</a>
          </div>
        </div>
      </div>
    );
  }

  // ─── 학습 모드 화면 ───
  if (mode === 'study') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 pt-8 sm:pt-12 p-3 sm:p-4">
        <WordStudy words={words} onFinishStudy={() => { setStudyCompleted(true); setMode('dashboard'); }} onBack={() => setMode('dashboard')} />
      </div>
    );
  }

  // ─── 시험 요청 대기 화면 ───
  if (mode === 'request_sent') {
    const isApproved = testRequest?.status === 'approved';
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col p-3 sm:p-4">
        <div className="m-auto max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl border-4 border-amber-200 p-5 sm:p-8 text-center">
          {isApproved ? (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-3xl sm:text-4xl">✅</div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-700 mb-1.5 sm:mb-2">시험이 승인되었어요!</h2>
              <p className="text-xs sm:text-base text-slate-500 font-medium mb-5 sm:mb-8">부모님/선생님이 시험을 허락해 주셨어! 시작해 볼까?</p>
              <button onClick={() => setMode('test')} className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-black text-lg sm:text-xl rounded-2xl shadow-lg shadow-orange-500/30 hover:from-orange-500 hover:to-amber-600 transition-all">
                🚀 시험 시작하기!
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-3xl sm:text-4xl animate-pulse">⏳</div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-700 mb-1.5 sm:mb-2">승인 대기 중...</h2>
              <p className="text-xs sm:text-base text-slate-500 font-medium mb-1.5 sm:mb-2">부모님/선생님의 승인을 기다리고 있어요!</p>
              <p className="text-slate-400 text-xs sm:text-sm mb-5 sm:mb-8">승인이 완료되면 아래 버튼을 눌러서 확인해 봐.</p>
              <button onClick={handleRefreshStatus} disabled={checkingRequest}
                className="w-full py-3 sm:py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base sm:text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70 mb-3 sm:mb-4">
                {checkingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : '🔄 승인 여부 확인하기'}
              </button>
              <button onClick={() => setMode('dashboard')} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">돌아가기</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── 오답 노트 화면 ───
  if (mode === 'wrong_note') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 pt-8 sm:pt-12 p-3 sm:p-4">
        <WrongNoteViewer
          userId={user.id}
          onBack={() => setMode('day_select')}
          onTokensEarned={async (tokens) => {
            await refreshUser();
            if (tokens > 0) setTimeout(() => alert(`오답 테스트 보너스로 ${tokens} 토큰이 지급되었어요!`), 300);
          }}
        />
      </div>
    );
  }

  // ─── 퀴즈(테스트) 화면 ───
  if (mode === 'test') {
    // 학습한 단어에서만 출제: 문항 수를 학습 단어 수 이하로 제한
    const questionCount = Math.min(user.test_question_count || 30, words.length);

    // 현재 Day의 전체 단어 중 아직 મા스터하지 않은 단어 목록 계산
    const totalDayWords = allWords.filter(w => w.category === selectedDay).map(w => w.word);
    const currentMastered = new Set(masteryMap[selectedDayNum] || []);
    const unmasteredWords = totalDayWords.filter(w => !currentMastered.has(w));

    return (
      <div className="min-h-[100dvh] bg-slate-50 pt-8 sm:pt-12 p-3 sm:p-4">
        <QuizViewer
          words={words}
          userId={user.id}
          questionCount={questionCount}
          isReviewMode={isReviewMode}
          dayNumber={selectedDayNum}
          unmasteredWords={unmasteredWords}
          onFinish={async (earnedFromQuiz, wrongWordIds, score, correctWords) => {
            // ─── 보상 분기 ───
            let actualEarned = 0;
            let isFirstClear = false;

            if (isReviewMode) {
              actualEarned = Math.floor(score / 5);
            } else {
              actualEarned = score;
            }

            // 하루 20토큰 제한
            const currentDailyTokens = user.daily_earned_tokens || 0;
            const maxAllowed = 20 - currentDailyTokens;
            let limitAlert = '';

            if (maxAllowed <= 0) {
              actualEarned = 0;
              limitAlert = '오늘은 이미 200원(20토큰)을 모두 획득해서 보상이 지급되지 않아요!';
            } else if (actualEarned > maxAllowed) {
              actualEarned = maxAllowed;
              limitAlert = `오늘 남은 획득 가능 금액은 ${maxAllowed * 10}원 이하여서, ${maxAllowed} 토큰만 지급되었어요.`;
            }

            // 토큰 지급
            if (actualEarned > 0) {
              try {
                await supabase.rpc('increment_tokens', { p_user_id: user.id, p_amount: actualEarned });
              } catch (e) { console.error('Token inc error:', e); }
            }

            // ─── 마스터리 기록 (정답 단어 upsert) ───
            if (!isReviewMode && correctWords.length > 0) {
              for (const w of correctWords) {
                await supabase.from('user_word_mastery').upsert({
                  user_id: user.id,
                  day_number: selectedDayNum,
                  word: w,
                  is_mastered: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,day_number,word' });
              }

              // masteryMap 로컬 업데이트
              setMasteryMap(prev => {
                const updated = { ...prev };
                if (!updated[selectedDayNum]) updated[selectedDayNum] = new Set();
                const newSet = new Set(updated[selectedDayNum]);
                correctWords.forEach(w => newSet.add(w));
                updated[selectedDayNum] = newSet;
                return updated;
              });
            }

            // ─── 100% 클리어 체크 → Day 해금 ───
            if (!isReviewMode) {
              const totalDayWords = allWords.filter(w => w.category === selectedDay).map(w => w.word);
              const currentMastered = new Set(masteryMap[selectedDayNum] || []);
              correctWords.forEach(w => currentMastered.add(w));

              if (currentMastered.size >= totalDayWords.length && totalDayWords.length > 0) {
                isFirstClear = true;
                const currentUnlocked = user.current_unlocked_day || 1;
                if (selectedDayNum >= currentUnlocked) {
                  await supabase.from('users').update({ current_unlocked_day: selectedDayNum + 1 }).eq('id', user.id);
                }
              }
            }

            // test_history 기록
            await supabase.from('test_history').insert([{
              user_id: user.id,
              day_number: selectedDayNum,
              score: score,
              earned_tokens: actualEarned,
              is_first_clear: isFirstClear
            }]);

            // ─── 오답 노트 자동 저장 ───
            if (wrongWordIds.length > 0) {
              for (const wid of wrongWordIds) {
                const { data: existing } = await supabase
                  .from('wrong_words')
                  .select('id, failed_count')
                  .eq('user_id', user.id)
                  .eq('word_id', wid)
                  .single();

                if (existing) {
                  await supabase.from('wrong_words').update({ failed_count: existing.failed_count + 1 }).eq('id', existing.id);
                } else {
                  await supabase.from('wrong_words').insert([{ user_id: user.id, word_id: wid, failed_count: 1 }]);
                }
              }
            }

            // ─── 연속 학습 streak 갱신 ───
            const now = new Date().toISOString();
            const today = now.split('T')[0];
            const lastStudy = user.last_study_date;
            let newStreak = user.current_streak || 0;
            let streakBonusAlert = '';

            if (lastStudy !== today) {
              // 어제 학습했으면 연속, 아니면 리셋
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

              if (lastStudy === yesterdayStr) {
                newStreak = newStreak + 1;
              } else {
                newStreak = 1;
              }

              // 7일 연속 보너스
              if (newStreak > 0 && newStreak % 7 === 0) {
                try {
                  await supabase.rpc('increment_tokens', { p_user_id: user.id, p_amount: 10 });
                  streakBonusAlert = `🔥 ${newStreak}일 연속 학습 달성! 보너스 10토큰이 지급되었어요!`;
                } catch (e) { console.error('Streak bonus error:', e); }
              }
            }

            await supabase.from('users').update({
              last_test_time: now,
              last_wrong_word_ids: wrongWordIds,
              daily_earned_tokens: currentDailyTokens + actualEarned,
              last_earn_date: today,
              current_streak: newStreak,
              last_study_date: today
            }).eq('id', user.id);

            setMode('day_select');
            setStudyCompleted(false);
            setTestRequest(null);
            if (testRequest) await supabase.from('test_requests').delete().eq('id', testRequest.id);
            await refreshUser();
            if (streakBonusAlert) setTimeout(() => alert(streakBonusAlert), 300);
            if (limitAlert) setTimeout(() => alert(limitAlert), streakBonusAlert ? 1500 : 500);
          }}
        />
      </div>
    );
  }

  // ─── Day 선택 화면 ───
  if (mode === 'day_select') {
    const unlockedDay = user.current_unlocked_day || 1;

    return (
      <div className="min-h-[100dvh] bg-slate-50 p-3 sm:p-4 md:p-8 pb-12">
        <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">

          {/* 헤더 */}
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg text-xl sm:text-2xl">😎</div>
              <div>
                <h1 className="text-base sm:text-xl font-black text-slate-800">안녕, <span className="text-blue-600">{user.nickname}</span>!</h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-sm text-slate-500 font-medium">진도: <span className="text-blue-600 font-black">Day {unlockedDay}</span></p>
                  {(user.current_streak || 0) > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px] sm:text-xs font-black border border-orange-200">
                      <Flame className="w-3 h-3 fill-orange-500" /> {user.current_streak}일
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTokenModal(true)} className="bg-yellow-50 hover:bg-yellow-100 flex items-center p-1 pr-3 sm:pr-4 rounded-xl border-2 border-yellow-200 transition-colors">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center shadow-inner mr-1.5 sm:mr-2 text-yellow-900"><Coins className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                <span className="text-sm sm:text-base font-black text-yellow-700">{(user.tokens ?? 0).toLocaleString()}</span>
              </button>
              <button onClick={() => { setUser(null); setMode('day_select'); setSelectedDay(null); }} className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>

          <TokenModal />

          {/* 오답 노트 버튼 */}
          <button onClick={() => setMode('wrong_note')}
            className="w-full bg-white hover:bg-red-50 rounded-2xl shadow-sm border-2 border-red-100 hover:border-red-300 p-3 sm:p-4 flex items-center gap-3 transition-all active:scale-[0.98]">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0">📝</div>
            <div className="text-left">
              <p className="font-black text-slate-800 text-sm sm:text-base">내 오답 노트</p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">틀린 단어를 다시 학습하고 테스트해 봐!</p>
            </div>
          </button>

          {/* 펫 아바타 */}
          <PetAvatar currentDay={unlockedDay} />

          {/* 럭키 보물상자 팝업 */}
          {showRoulette && (
            <DailyRoulette
              userId={user.id}
              onClose={() => setShowRoulette(false)}
              onTokensEarned={async () => { await refreshUser(); }}
            />
          )}

          {/* Day 그리드 */}
          {dayCategories.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {dayCategories.map((day) => {
                const dayNum = extractDayNum(day);
                const count = allWords.filter(w => w.category === day).length;
                const masteredCount = masteryMap[dayNum]?.size || 0;
                const progress = count > 0 ? Math.round((masteredCount / count) * 100) : 0;
                const isCompleted = dayNum < unlockedDay;
                const isCurrent = dayNum === unlockedDay;
                const isLocked = dayNum > unlockedDay;

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    disabled={isLocked}
                    className={`rounded-xl sm:rounded-2xl shadow-sm border-2 p-3 sm:p-4 text-center transition-all group ${isLocked
                      ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                      : isCurrent
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-md shadow-blue-200/50 ring-2 ring-blue-300 hover:shadow-lg active:scale-[0.97]'
                        : 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-md active:scale-[0.97]'
                      }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-1.5 sm:mb-2 transition-colors ${isLocked
                      ? 'bg-slate-200'
                      : isCurrent
                        ? 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md'
                        : 'bg-gradient-to-br from-emerald-100 to-teal-100'
                      }`}>
                      {isLocked ? (
                        <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                      ) : isCurrent ? (
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      ) : (
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 fill-emerald-500" />
                      )}
                    </div>
                    <p className={`font-black text-xs sm:text-sm ${isLocked ? 'text-slate-400' : isCurrent ? 'text-blue-700' : 'text-emerald-700'
                      }`}>{day}</p>

                    {/* 프로그레스 바 */}
                    {!isLocked && (
                      <div className="mt-1.5">
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progress >= 100
                              ? 'bg-emerald-500'
                              : isCurrent ? 'bg-blue-500' : 'bg-amber-400'
                              }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className={`text-[9px] sm:text-[10px] font-bold mt-0.5 ${progress >= 100 ? 'text-emerald-500' : isCurrent ? 'text-blue-400' : 'text-slate-400'
                          }`}>
                          {progress >= 100 ? '✅ 완료!' : `${masteredCount}/${count}`}
                        </p>
                      </div>
                    )}
                    {isLocked && (
                      <p className="text-[10px] sm:text-xs font-medium text-slate-300">🔒 잠김</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl border-4 border-dashed border-slate-200 text-center">
              <div className="text-4xl sm:text-6xl mb-3 grayscale opacity-50">📭</div>
              <h3 className="text-base sm:text-xl font-bold text-slate-700 mb-2">아직 등록된 Day가 없어!</h3>
              <p className="text-xs sm:text-base text-slate-500 font-medium">선생님이나 부모님이 단어를 추가해 줄 때까지 기다려 줘.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 메인 대시보드 화면 (Day 선택 후) ───
  const unlockedDay = user.current_unlocked_day || 1;

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-3 sm:p-4 md:p-8 pb-12">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-8">

        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-slate-100">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button onClick={() => { setMode('day_select'); setSelectedDay(null); setStudyCompleted(false); setTestRequest(null); }}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 hover:bg-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-800">
                  <span className="text-blue-600">{selectedDay}</span> 학습
                </h1>
                {isReviewMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">복습</span>
                )}
              </div>
              <p className="text-xs sm:text-base text-slate-500 font-medium">
                {isReviewMode
                  ? '복습 모드: 정답 5개당 1토큰 지급!'
                  : `${words.length}개의 단어가 준비되어 있어!`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button onClick={() => setShowTokenModal(true)} className="bg-yellow-50 hover:bg-yellow-100 flex items-center p-1 pr-4 sm:pr-6 rounded-xl sm:rounded-2xl border-2 border-yellow-200 flex-1 sm:flex-auto transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner mr-2 sm:mr-3 text-yellow-900"><Coins className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs font-bold text-yellow-600 mb-0.5">보유 토큰</p>
                <p className="text-lg sm:text-xl font-black text-yellow-700 leading-none">{(user.tokens ?? 0).toLocaleString()}</p>
              </div>
            </button>
            <button onClick={() => { setUser(null); setStudyCompleted(false); setTestRequest(null); setMode('day_select'); }} className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"><LogOut className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </div>
        </div>

        <TokenModal />

        {/* 복습 모드 안내 배너 */}
        {isReviewMode && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0">🔁</div>
            <div>
              <p className="font-black text-amber-800 text-sm sm:text-base">반복 학습 모드예요!</p>
              <p className="text-xs sm:text-sm text-amber-600 font-medium">정답 5개를 맞출 때마다 1토큰이 지급돼요.</p>
            </div>
          </div>
        )}

        {/* 액션 섹션 */}
        <div className="grid grid-cols-1 lg:max-w-2xl lg:mx-auto gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            {words.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {/* 1단계: 단어 학습 */}
                <button onClick={() => setMode('study')}
                  className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 p-5 sm:p-8 text-left transition-all group ${studyCompleted ? 'border-emerald-200 opacity-80' : 'border-indigo-200 hover:shadow-lg hover:border-indigo-300'}`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${studyCompleted ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                      {studyCompleted ? <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" /> : <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-black text-slate-800">{studyCompleted ? '✅ 학습 완료!' : '📖 1단계: 단어 학습하기'}</h3>
                      <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">
                        {studyCompleted ? '잘했어! 다시 학습하려면 눌러봐.' : `카드를 넘기며 ${words.length}개의 단어를 공부해 봐!`}
                      </p>
                    </div>
                  </div>
                </button>

                {/* 2단계: 시험 */}
                {studyCompleted && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {testRequest?.status === 'approved' ? (
                      <button onClick={() => setMode('test')}
                        className="w-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl sm:rounded-3xl shadow-lg shadow-orange-500/20 p-5 sm:p-8 text-left hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-2xl sm:text-3xl shrink-0">🚀</div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-white">⚡ 2단계: 시험 시작!</h3>
                            <p className="text-xs sm:text-base text-orange-100 font-medium mt-0.5 sm:mt-1">
                              {isReviewMode ? '복습 시험! 정답 5개당 1토큰' : `승인 완료! ${user.test_question_count || 30}문제 도전!`}
                            </p>
                          </div>
                        </div>
                      </button>
                    ) : testRequest?.status === 'pending' ? (
                      <button onClick={() => setMode('request_sent')}
                        className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 border-amber-200 p-5 sm:p-8 text-left hover:shadow-lg transition-all group">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" /></div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-amber-700">⏳ 시험 승인 대기 중...</h3>
                            <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">부모님/선생님의 승인을 기다리고 있어.</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button onClick={handleRequestTest}
                        className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 border-blue-200 p-5 sm:p-8 text-left hover:shadow-lg hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-2xl sm:text-3xl shrink-0">📝</div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-slate-800">📝 2단계: 시험 요청하기</h3>
                            <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">학습을 마쳤어! 시험 승인을 요청해 봐!</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {!studyCompleted && (
                  <div className="bg-slate-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 p-4 sm:p-6 text-center">
                    <p className="text-xs sm:text-base text-slate-400 font-bold">🔒 먼저 단어를 학습해야 시험을 볼 수 있어!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl border-4 border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 grayscale opacity-50">📭</div>
                <h3 className="text-base sm:text-xl font-bold text-slate-700 mb-1.5 sm:mb-2">이 Day에는 아직 단어가 없어!</h3>
                <p className="text-xs sm:text-base text-slate-500 font-medium">선생님이나 부모님이 단어를 추가해 줄 때까지 기다려 줘.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
