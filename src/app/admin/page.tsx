'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // DB에서 관리자 비밀번호 조회
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_pin')
                .single();

            // DB에 설정이 없으면 환경변수 또는 기본값 사용
            const correctPin = data?.value || process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';

            if (pin === correctPin) {
                localStorage.setItem('isAdmin', 'true');
                router.push('/admin/words');
            } else {
                alert('비밀번호가 틀렸습니다!');
                setPin('');
            }
        } catch (error) {
            console.error('로그인 에러:', error);
            // DB 연결 실패 시 환경변수/기본값으로 폴백
            const fallbackPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';
            if (pin === fallbackPin) {
                localStorage.setItem('isAdmin', 'true');
                router.push('/admin/words');
            } else {
                alert('비밀번호가 틀렸습니다!');
                setPin('');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-slate-800">
                    <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5 sm:mb-2">관리자 접속</h1>
                <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8 font-medium">단어장과 정산을 관리하려면 비밀번호를 입력하세요.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="비밀번호 입력..."
                        className="w-full text-center text-lg sm:text-xl font-bold py-3 sm:py-4 px-4 sm:px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all tracking-widest"
                        required
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 sm:py-4 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-base sm:text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '관리자 로그인'}
                    </button>
                </form>

                <div className="mt-6 text-xs text-slate-400">
                    비밀번호는 관리자 메뉴 <strong>⚙️ 설정</strong> 탭에서 변경할 수 있습니다.
                </div>
            </div>
        </div>
    );
}
