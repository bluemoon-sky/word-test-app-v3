'use client';

import { useState, useEffect, useCallback } from 'react';
import WordStudy from '@/components/student/WordStudy';
import QuizViewer from '@/components/student/QuizViewer';
import { Word, User, TestRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { Coins, LogOut, Loader2, BookOpen, Clock, CheckCircle, X } from 'lucide-react';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  // 학생 플로우: dashboard → study → request_sent → test
  const [mode, setMode] = useState<'dashboard' | 'study' | 'request_sent' | 'test'>('dashboard');
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [testRequest, setTestRequest] = useState<TestRequest | null>(null);
  const [checkingRequest, setCheckingRequest] = useState(false);

  // 시험 요청 상태 확인하는 함수
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

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!existingUser) {
        alert('등록되지 않은 이름이에요! 부모님이나 선생님께 여쭤보세요.');
        return;
      }

      // 날짜가 바뀌었으면 daily_earned_tokens 초기화 로직
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const userLastEarnDate = existingUser.last_earn_date;

      let finalUser = existingUser as User;

      if (userLastEarnDate !== today) {
        const { data: updatedUser, error: resetError } = await supabase
          .from('users')
          .update({ daily_earned_tokens: 0, last_earn_date: today })
          .eq('id', existingUser.id)
          .select()
          .single();
        if (!resetError && updatedUser) {
          finalUser = updatedUser as User;
        }
      }

      setUser(finalUser);

      // 단어 가져오기 (마지막 시험 오답 여부 포함해서 정렬)
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${existingUser.id}`);
      if (wordsError) throw wordsError;

      let fetchedWords = wordsData as Word[];

      // 오답 위주 정렬: last_wrong_word_ids에 있는 단어를 맨 앞으로 (0이 앞에 오도록)
      if (finalUser.last_wrong_word_ids && finalUser.last_wrong_word_ids.length > 0) {
        const wrongIds = new Set(finalUser.last_wrong_word_ids);
        fetchedWords.sort((a, b) => {
          const aIsWrong = wrongIds.has(a.id) ? 0 : 1;
          const bIsWrong = wrongIds.has(b.id) ? 0 : 1;
          return aIsWrong - bIsWrong;
        });
      }

      setWords(fetchedWords);

      // 기존 시험 요청 확인
      await checkTestRequest(existingUser.id);

    } catch (error) {
      console.error('Error logging in:', error);
      alert('접속 중 오류가 발생했어요. 다시 시도해 주세요!');
    } finally {
      setLoading(false);
    }
  };

  // 시험 요청 보내기
  const handleRequestTest = async () => {
    if (!user) return;

    try {
      // 기존 pending 요청이 있으면 사용
      if (testRequest && testRequest.status === 'pending') {
        setMode('request_sent');
        return;
      }

      // 30분 쿨다운 체크
      if (user.last_test_time) {
        const lastTestTime = new Date(user.last_test_time).getTime();
        const now = new Date().getTime();
        const diffMinutes = (now - lastTestTime) / (1000 * 60);

        if (diffMinutes < 30) {
          const remainMinutes = Math.ceil(30 - diffMinutes);
          alert(`아직 시험을 다시 볼 수 없어요!\n${remainMinutes}분 후에 다시 요청할 수 있습니다.`);
          return;
        }
      }

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

  // 승인 여부 새로고침
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

    const confirmExchange = window.confirm(`현재 ${exchangeableTokens} 토큰을 용돈 ${amount.toLocaleString()}원으로 교환 신청할까요? (남은 토큰: ${user.tokens - exchangeableTokens}개)`);
    if (!confirmExchange) return;

    try {
      const { error: requestError } = await supabase
        .from('exchange_requests')
        .insert([{ user_id: user.id, tokens_deducted: exchangeableTokens, amount: amount, status: 'pending' }]);
      if (requestError) throw requestError;

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ tokens: user.tokens - exchangeableTokens })
        .eq('id', user.id)
        .select()
        .single();
      if (updateError) throw updateError;

      setUser(updatedUser as User);
      alert('용돈 교환 신청이 완료되었어요! 부모님/선생님을 기다려 주세요.');
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

  // ─── 로그인 화면 ───
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col p-4 text-center">
        <div className="m-auto max-w-md w-full bg-white rounded-3xl shadow-xl border-4 border-blue-200 p-6 sm:p-8 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner text-3xl sm:text-4xl">
            🚀
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">영단어 마스터!</h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mb-6 sm:mb-8">내 이름을 입력하고 단어 시험을 시작해 봐!</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="여기에 이름 입력..."
              className="w-full text-center text-lg sm:text-xl font-bold py-3 sm:py-4 px-4 sm:px-6 bg-slate-50 border-4 border-slate-200 rounded-2xl focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '접속하기!'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <a href="/admin" className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
              <LogOut className="w-4 h-4" />
              관리자 메뉴
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── 학습 모드 화면 ───
  if (mode === 'study') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 pt-8 sm:pt-12 p-3 sm:p-4">
        <WordStudy
          words={words}
          onFinishStudy={() => {
            setStudyCompleted(true);
            setMode('dashboard');
          }}
          onBack={() => setMode('dashboard')}
        />
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
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-3xl sm:text-4xl">
                ✅
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-700 mb-1.5 sm:mb-2">시험이 승인되었어요!</h2>
              <p className="text-xs sm:text-base text-slate-500 font-medium mb-5 sm:mb-8">부모님/선생님이 시험을 허락해 주셨어! 시작해 볼까?</p>
              <button
                onClick={() => setMode('test')}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-black text-lg sm:text-xl rounded-2xl shadow-lg shadow-orange-500/30 hover:from-orange-500 hover:to-amber-600 transition-all"
              >
                🚀 시험 시작하기!
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-3xl sm:text-4xl animate-pulse">
                ⏳
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-700 mb-1.5 sm:mb-2">승인 대기 중...</h2>
              <p className="text-xs sm:text-base text-slate-500 font-medium mb-1.5 sm:mb-2">부모님/선생님의 승인을 기다리고 있어요!</p>
              <p className="text-slate-400 text-xs sm:text-sm mb-5 sm:mb-8">승인이 완료되면 아래 버튼을 눌러서 확인해 봐.</p>

              <button
                onClick={handleRefreshStatus}
                disabled={checkingRequest}
                className="w-full py-3 sm:py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base sm:text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70 mb-3 sm:mb-4"
              >
                {checkingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : '🔄 승인 여부 확인하기'}
              </button>

              <button
                onClick={() => setMode('dashboard')}
                className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                돌아가기
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── 퀴즈(테스트) 화면 ───
  if (mode === 'test') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 pt-8 sm:pt-12 p-3 sm:p-4">
        <QuizViewer
          words={words}
          userId={user.id}
          onFinish={async (earnedTokens, wrongWordIds) => {
            // 하루 20토큰 제한 로직
            const currentDailyTokens = user.daily_earned_tokens || 0;
            const maxAllowed = 20 - currentDailyTokens;
            let actualEarned = earnedTokens;
            let limitAlert = '';

            if (maxAllowed <= 0) {
              actualEarned = 0;
              limitAlert = '오늘은 이미 200원(20토큰)을 모두 획득해서 보상이 지급되지 않아요!';
            } else if (earnedTokens > maxAllowed) {
              actualEarned = maxAllowed;
              limitAlert = `오늘 남은 획득 가능 금액은 ${maxAllowed * 10}원 이하여서, ${maxAllowed} 토큰만 지급되었어요.`;
            }

            // 토큰 업데이트 처리
            if (actualEarned > 0) {
              try {
                await supabase.rpc('increment_tokens', { p_user_id: user.id, p_amount: actualEarned });
              } catch (e) { console.error('Token inc error:', e); }
            }

            // last 시간, 오답 목록 및 daily 업데이트
            const now = new Date().toISOString();
            const today = now.split('T')[0];

            await supabase
              .from('users')
              .update({
                last_test_time: now,
                last_wrong_word_ids: wrongWordIds,
                daily_earned_tokens: currentDailyTokens + actualEarned,
                last_earn_date: today
              })
              .eq('id', user.id);

            setMode('dashboard');
            setStudyCompleted(false);
            setTestRequest(null);

            if (testRequest) {
              await supabase.from('test_requests').delete().eq('id', testRequest.id);
            }

            await refreshUser();

            if (limitAlert) {
              setTimeout(() => alert(limitAlert), 500);
            }
          }}
        />
      </div>
    );
  }

  // ─── 토큰 상세 모달 ───
  const [showTokenModal, setShowTokenModal] = useState(false);

  // ─── 메인 대시보드 화면 ───
  return (
    <div className="min-h-[100dvh] bg-slate-50 p-3 sm:p-4 md:p-8 pb-12">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-8">

        {/* 헤더 섹션 */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-slate-100">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 text-2xl sm:text-3xl">
              😎
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-800">안녕, <span className="text-blue-600">{user.nickname}</span>!</h1>
              <p className="text-xs sm:text-base text-slate-500 font-medium">오늘도 단어 마스터가 되어볼까?</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowTokenModal(true)}
              className="bg-yellow-50 hover:bg-yellow-100 flex items-center p-1 pr-4 sm:pr-6 rounded-xl sm:rounded-2xl border-2 border-yellow-200 flex-1 sm:flex-auto transition-colors focus:outline-none"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner mr-2 sm:mr-3 text-yellow-900">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs font-bold text-yellow-600 mb-0.5">보유 토큰 (자세히 👆)</p>
                <p className="text-lg sm:text-xl font-black text-yellow-700 leading-none">{(user.tokens ?? 0).toLocaleString()}</p>
              </div>
            </button>

            <button onClick={() => { setUser(null); setStudyCompleted(false); setTestRequest(null); setMode('dashboard'); }} className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 토큰 상세/정산 모달 */}
        {showTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowTokenModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                💰
              </div>
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
                <p className="text-center text-xs font-bold text-slate-400 bg-slate-50 py-1.5 rounded-full">
                  ⚠️ 1,000원 단위로만 정산 가능해요!
                </p>
              </div>

              <button
                onClick={() => {
                  setShowTokenModal(false);
                  handleExchange();
                }}
                disabled={user.tokens < 100}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-lg rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
              >
                1,000원 단위로 정산 신청하기
              </button>
            </div>
          </div>
        )}

        {/* 액션 섹션 */}
        <div className="grid grid-cols-1 lg:max-w-2xl lg:mx-auto gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            {words.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {/* 1단계: 단어 학습 */}
                <button
                  onClick={() => setMode('study')}
                  className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 p-5 sm:p-8 text-left transition-all group ${studyCompleted
                    ? 'border-emerald-200 opacity-80'
                    : 'border-indigo-200 hover:shadow-lg hover:border-indigo-300'
                    }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${studyCompleted ? 'bg-emerald-100' : 'bg-indigo-100'
                      }`}>
                      {studyCompleted ? (
                        <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                      ) : (
                        <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-black text-slate-800">
                        {studyCompleted ? '✅ 학습 완료!' : '📖 1단계: 단어 학습하기'}
                      </h3>
                      <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">
                        {studyCompleted
                          ? '잘했어! 다시 학습하려면 눌러봐.'
                          : `카드를 넘기며 ${words.length}개의 단어를 공부해 봐!`
                        }
                      </p>
                    </div>
                  </div>
                </button>

                {/* 2단계: 시험 요청/시험 보기 */}
                {studyCompleted && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {testRequest?.status === 'approved' ? (
                      // 승인됨 → 시험 가능
                      <button
                        onClick={() => setMode('test')}
                        className="w-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl sm:rounded-3xl shadow-lg shadow-orange-500/20 p-5 sm:p-8 text-left hover:shadow-xl transition-all group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-2xl sm:text-3xl shrink-0">
                            🚀
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-white">⚡ 2단계: 시험 시작!</h3>
                            <p className="text-xs sm:text-base text-orange-100 font-medium mt-0.5 sm:mt-1">승인이 완료되었어! 시험을 봐서 토큰을 획득해 봐!</p>
                          </div>
                        </div>
                      </button>
                    ) : testRequest?.status === 'pending' ? (
                      // 대기 중
                      <button
                        onClick={() => setMode('request_sent')}
                        className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 border-amber-200 p-5 sm:p-8 text-left hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-amber-700">⏳ 시험 승인 대기 중...</h3>
                            <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">부모님/선생님의 승인을 기다리고 있어. 여기를 눌러 확인해 봐!</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      // 아직 요청 안 함
                      <button
                        onClick={handleRequestTest}
                        className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm border-4 border-blue-200 p-5 sm:p-8 text-left hover:shadow-lg hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-2xl sm:text-3xl shrink-0">
                            📝
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-xl font-black text-slate-800">📝 2단계: 시험 요청하기</h3>
                            <p className="text-xs sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">학습을 마쳤어! 부모님/선생님에게 시험 승인을 요청해 봐!</p>
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
                <h3 className="text-base sm:text-xl font-bold text-slate-700 mb-1.5 sm:mb-2">아직 외울 단어가 없어!</h3>
                <p className="text-xs sm:text-base text-slate-500 font-medium">선생님이나 부모님이 단어를 추가해 줄 때까지 기다려 줘.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
