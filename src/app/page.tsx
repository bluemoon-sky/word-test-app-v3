'use client';

import { useState } from 'react';
import TestScopeSelector from '@/components/student/TestScopeSelector';
import QuizViewer from '@/components/student/QuizViewer';
import { Word, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { Coins, LogOut, Loader2 } from 'lucide-react';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [testWords, setTestWords] = useState<Word[] | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      // 닉네임으로 유저 찾기
      let { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('nickname', nickname.trim())
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      // 유저가 없으면 새로 생성 (기본 학생)
      if (!existingUser) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ nickname: nickname.trim(), role: 'kid' }])
          .select()
          .single();

        if (createError) throw createError;
        existingUser = newUser;
      }

      setUser(existingUser as User);

      // 공통 단어 + 해당 학생 전용 단어 가져오기
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${existingUser.id}`);

      if (wordsError) throw wordsError;
      setWords(wordsData as Word[]);

    } catch (error) {
      console.error('Error logging in:', error);
      alert('접속 중 오류가 발생했어요. 다시 시도해 주세요!');
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = async () => {
    if (!user || user.tokens <= 0) {
      alert('교환할 토큰이 없어요!');
      return;
    }

    const confirmExchange = window.confirm(`현재 ${user.tokens} 토큰을 용돈 ${(user.tokens * 10).toLocaleString()}원으로 교환 신청할까요?`);
    if (!confirmExchange) return;

    try {
      // 1. 교환 요청 생성
      const { error: requestError } = await supabase
        .from('exchange_requests')
        .insert([{
          user_id: user.id,
          tokens_deducted: user.tokens,
          amount: user.tokens * 10,
          status: 'pending'
        }]);

      if (requestError) throw requestError;

      // 2. 유저 토큰 0으로 초기화
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

  // 로그인 화면
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

  // 퀴즈 화면
  if (testWords) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <QuizViewer
          words={testWords}
          userId={user.id}
          onFinish={() => {
            setTestWords(null);
            supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => {
              if (data) setUser(data as User);
            });
          }}
        />
      </div>
    );
  }

  // 메인 대시보드 화면
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

            <button onClick={() => setUser(null)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 액션 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {words.length > 0 ? (
              <TestScopeSelector words={words} onStartTest={setTestWords} />
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
