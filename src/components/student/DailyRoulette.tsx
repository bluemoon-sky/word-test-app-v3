'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Coins, X } from 'lucide-react';

type Props = {
    userId: string;
    onClose: () => void;
    onTokensEarned: (tokens: number) => void;
};

// 보상: 1~5 토큰 랜덤
function rollReward(): number {
    return Math.floor(Math.random() * 5) + 1;
}

export default function DailyRoulette({ userId, onClose, onTokensEarned }: Props) {
    const [phase, setPhase] = useState<'ready' | 'opening' | 'result'>('ready');
    const [reward, setReward] = useState(0);
    const [shakeClass, setShakeClass] = useState('');

    const handleOpen = async () => {
        setPhase('opening');
        setShakeClass('animate-bounce');

        // 상자 흔들기 연출 후 결과
        setTimeout(async () => {
            const earned = rollReward();
            setReward(earned);
            setPhase('result');
            setShakeClass('');

            // 토큰 지급
            try {
                await supabase.rpc('increment_tokens', { p_user_id: userId, p_amount: earned });
            } catch (e) { console.error('Roulette token error:', e); }

            // 날짜 기록
            const today = new Date().toISOString().split('T')[0];
            await supabase.from('users').update({ last_roulette_date: today }).eq('id', userId);

            onTokensEarned(earned);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center relative animate-in zoom-in-95 duration-500">
                <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                    <X className="w-4 h-4" />
                </button>

                {phase === 'ready' && (
                    <>
                        <div className="text-6xl sm:text-7xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🎁</div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">오늘의 보물상자!</h2>
                        <p className="text-sm text-slate-500 font-medium mb-6">매일 한 번! 1~5 랜덤 보너스 토큰을 받아가세요! 🎲</p>
                        <button onClick={handleOpen}
                            className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-300/50 hover:from-amber-500 hover:to-orange-600 transition-all active:scale-95">
                            🎁 보물상자 열기!
                        </button>
                    </>
                )}

                {phase === 'opening' && (
                    <>
                        <div className={`text-7xl sm:text-8xl mb-4 ${shakeClass}`} style={{ animationDuration: '0.3s' }}>🎁</div>
                        <h2 className="text-xl font-black text-amber-600 animate-pulse">두근두근... 열리는 중!</h2>
                        <div className="mt-4 flex justify-center">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    </>
                )}

                {phase === 'result' && (
                    <>
                        <div className="text-6xl sm:text-7xl mb-2 animate-in zoom-in-50 duration-500">
                            {reward === 5 ? '💎' : reward === 3 ? '✨' : '🪙'}
                        </div>
                        <div className={`inline-block px-4 py-2 rounded-2xl font-black text-2xl sm:text-3xl mb-3 animate-in zoom-in-75 duration-700 ${reward === 5 ? 'bg-purple-100 text-purple-700' : reward === 3 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            +{reward} 토큰!
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-6">
                            {reward === 5 ? '🎉 대박! 최고 보상이에요!' : reward === 3 ? '👍 좋아요! 럭키 보너스!' : '🪙 보너스 토큰 획득!'}
                        </p>
                        <button onClick={onClose}
                            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-colors">
                            확인!
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
