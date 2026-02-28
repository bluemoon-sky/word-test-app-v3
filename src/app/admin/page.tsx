'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 환경 변수에 설정된 PIN 혹은 기본값 '1234'
        const correctPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';

        setTimeout(() => {
            if (pin === correctPin) {
                // 로컬스토리지에 인증 정보 저장 (간단한 보안)
                localStorage.setItem('isAdmin', 'true');
                router.push('/admin/words');
            } else {
                alert('비밀번호가 틀렸습니다!');
                setPin('');
            }
            setLoading(false);
        }, 500); // 약간의 딜레이로 로그인 느낌 주기
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-800">
                    <Lock className="w-8 h-8" />
                </div>

                <h1 className="text-2xl font-black text-slate-800 mb-2">관리자 접속</h1>
                <p className="text-slate-500 text-sm mb-8 font-medium">단어장과 정산을 관리하려면 비밀번호를 입력하세요.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="비밀번호 문자 숫자 등 자유롭게 입력..."
                        className="w-full text-center text-xl font-bold py-4 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all tracking-widest"
                        required
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '관리자 로그인'}
                    </button>
                </form>

                <div className="mt-6 text-xs text-slate-400">
                    초기 기본 비밀번호는 <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">1234</code> 입니다.
                    <br />(Vercel 환경 변수 <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">NEXT_PUBLIC_ADMIN_PIN</code>에 추가하여 변경 가능)
                </div>
            </div>
        </div>
    );
}
