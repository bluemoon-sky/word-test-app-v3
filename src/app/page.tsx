'use client';

import { useState, useEffect, useCallback } from 'react';
import WordStudy from '@/components/student/WordStudy';
import QuizViewer from '@/components/student/QuizViewer';
import { Word, User, TestRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { Coins, LogOut, Loader2, BookOpen, Clock, CheckCircle } from 'lucide-react';

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

      setUser(existingUser as User);

      // 단어 가져오기
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${existingUser.id}`);
      if (wordsError) throw wordsError;
      setWords(wordsData as Word[]);

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
    if (!user || user.tokens <= 0) {
      alert('교환할 토큰이 없어요!');
      return;
    }
    const confirmExchange = window.confirm(`현재 ${user.tokens} 토큰을 용돈 ${(user.tokens * 10).toLocaleString()}원으로 교환 신청할까요?`);
    if (!confirmExchange) return;

    try {
      const { error: requestError } = await supabase
        .from('exchange_requests')
        .insert([{ user_id: user.id, tokens_deducted: user.tokens, amount: user.tokens * 10, status: 'pending' }]);
      if (requestError) throw requestError;

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ tokens: 0 })
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border-4 border-blue-200 p-8 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-4xl">
            🚀
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">영단어 마스터!</h1>
          <p className="text-slate-500 font-medium mb-8">내 이름을 입력하고 단어 시험을 시작해 봐!</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="여기에 이름 입력..."
              className="w-full text-center text-xl font-bold py-4 px-6 bg-slate-50 border-4 border-slate-200 rounded-2xl focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xl rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '접속하기!'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <a href="/admin" className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
              <LogOut className="w-4 h-4" />
              부모님/선생님 메뉴
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── 학습 모드 화면 ───
  if (mode === 'study') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border-4 border-amber-200 p-8 text-center">
          {isApproved ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ✅
              </div>
              <h2 className="text-2xl font-black text-emerald-700 mb-2">시험이 승인되었어요!</h2>
              <p className="text-slate-500 font-medium mb-8">부모님/선생님이 시험을 허락해 주셨어! 시작해 볼까?</p>
              <button
                onClick={() => setMode('test')}
                className="w-full py-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-black text-xl rounded-2xl shadow-lg shadow-orange-500/30 hover:from-orange-500 hover:to-amber-600 transition-all"
              >
                🚀 시험 시작하기!
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-pulse">
                ⏳
              </div>
              <h2 className="text-2xl font-black text-amber-700 mb-2">승인 대기 중...</h2>
              <p className="text-slate-500 font-medium mb-2">부모님/선생님의 승인을 기다리고 있어요!</p>
              <p className="text-slate-400 text-sm mb-8">승인이 완료되면 아래 버튼을 눌러서 확인해 봐.</p>

              <button
                onClick={handleRefreshStatus}
                disabled={checkingRequest}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70 mb-4"
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <QuizViewer
          words={words}
          userId={user.id}
          onFinish={async () => {
            setMode('dashboard');
            setStudyCompleted(false);
            setTestRequest(null);
            // 시험 완료 후 사용한 요청 삭제/리셋 (다음 번 학습→신청 사이클을 위해)
            if (testRequest) {
              await supabase.from('test_requests').delete().eq('id', testRequest.id);
            }
            refreshUser();
          }}
        />
      </div>
    );
  }

  // ─── 메인 대시보드 화면 ───
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* 헤더 섹션 */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 text-3xl">
              😎
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">안녕, <span className="text-blue-600">{user.nickname}</span>!</h1>
              <p className="text-slate-500 font-medium">오늘도 단어 마스터가 되어볼까?</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-yellow-50 flex items-center p-1 pr-6 rounded-2xl border-2 border-yellow-200">
              <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-inner mr-3 text-yellow-900">
                <Coins className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-yellow-600 mb-0.5">보유 토큰</p>
                <p className="text-xl font-black text-yellow-700 leading-none">{user.tokens.toLocaleString()}</p>
              </div>
            </div>

            <button onClick={() => { setUser(null); setStudyCompleted(false); setTestRequest(null); setMode('dashboard'); }} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 액션 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {words.length > 0 ? (
              <div className="space-y-4">
                {/* 1단계: 단어 학습 */}
                <button
                  onClick={() => setMode('study')}
                  className={`w-full bg-white rounded-3xl shadow-sm border-4 p-8 text-left transition-all group ${studyCompleted
                    ? 'border-emerald-200 opacity-80'
                    : 'border-indigo-200 hover:shadow-lg hover:border-indigo-300'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${studyCompleted ? 'bg-emerald-100' : 'bg-indigo-100'
                      }`}>
                      {studyCompleted ? (
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <BookOpen className="w-8 h-8 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">
                        {studyCompleted ? '✅ 학습 완료!' : '📖 1단계: 단어 학습하기'}
                      </h3>
                      <p className="text-slate-500 font-medium mt-1">
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
                        className="w-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-3xl shadow-lg shadow-orange-500/20 p-8 text-left hover:shadow-xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-3xl">
                            🚀
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white">⚡ 2단계: 시험 시작!</h3>
                            <p className="text-orange-100 font-medium mt-1">승인이 완료되었어! 시험을 봐서 토큰을 획득해 봐!</p>
                          </div>
                        </div>
                      </button>
                    ) : testRequest?.status === 'pending' ? (
                      // 대기 중
                      <button
                        onClick={() => setMode('request_sent')}
                        className="w-full bg-white rounded-3xl shadow-sm border-4 border-amber-200 p-8 text-left hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-8 h-8 text-amber-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-amber-700">⏳ 시험 승인 대기 중...</h3>
                            <p className="text-slate-500 font-medium mt-1">부모님/선생님의 승인을 기다리고 있어. 여기를 눌러 확인해 봐!</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      // 아직 요청 안 함
                      <button
                        onClick={handleRequestTest}
                        className="w-full bg-white rounded-3xl shadow-sm border-4 border-blue-200 p-8 text-left hover:shadow-lg hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-3xl">
                            📝
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800">📝 2단계: 시험 요청하기</h3>
                            <p className="text-slate-500 font-medium mt-1">학습을 마쳤어! 부모님/선생님에게 시험 승인을 요청해 봐!</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {!studyCompleted && (
                  <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
                    <p className="text-slate-400 font-bold">🔒 먼저 단어를 학습해야 시험을 볼 수 있어!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-10 rounded-3xl border-4 border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="text-6xl mb-4 grayscale opacity-50">📭</div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">아직 외울 단어가 없어!</h3>
                <p className="text-slate-500 font-medium">선생님이나 부모님이 단어를 추가해 줄 때까지 기다려 줘.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-b from-emerald-400 to-teal-500 rounded-3xl p-6 text-white shadow-lg shadow-teal-500/30">
              <div className="mb-6">
                <h3 className="font-bold text-teal-100 mb-2">현재 교환 가능한 용돈</h3>
                <p className="text-4xl font-black">₩ {(user.tokens * 10).toLocaleString()}</p>
                <p className="text-sm text-teal-100 mt-2 font-medium bg-black/10 inline-block px-3 py-1 rounded-full">1 토큰당 10원으로 계산됨</p>
              </div>

              <button
                onClick={handleExchange}
                disabled={user.tokens <= 0}
                className="w-full py-4 bg-white text-teal-700 font-bold text-lg rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                용돈으로 교환 신청하기 💸
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
