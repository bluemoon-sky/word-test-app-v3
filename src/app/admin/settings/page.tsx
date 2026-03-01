'use client';

import { useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import { supabase } from '@/lib/supabase';
import { Lock, Save, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function AdminSettingsPage() {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPin.trim() || !newPin.trim()) return;

        if (newPin !== confirmPin) {
            alert('새 비밀번호가 일치하지 않습니다!');
            return;
        }

        if (newPin.length < 4) {
            alert('비밀번호는 최소 4자 이상이어야 합니다!');
            return;
        }

        setSaving(true);
        setSuccess(false);

        try {
            // 현재 비밀번호 확인
            const { data: current } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_pin')
                .single();

            const correctPin = current?.value || '1234';

            if (currentPin !== correctPin) {
                alert('현재 비밀번호가 틀렸습니다!');
                setSaving(false);
                return;
            }

            // 비밀번호 업데이트 (upsert)
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'admin_pin', value: newPin }, { onConflict: 'key' });

            if (error) throw error;

            setSuccess(true);
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('비밀번호 변경 에러:', error);
            alert('비밀번호 변경 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <div className="p-3 sm:p-6 md:p-8 max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl sm:text-3xl font-black text-slate-800">⚙️ 설정</h1>
                    <p className="text-xs sm:text-base text-slate-500 mt-1">관리자 계정 설정을 관리합니다.</p>
                </div>

                {/* 비밀번호 변경 카드 */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" /> 관리자 비밀번호 변경
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">관리자 로그인에 사용되는 비밀번호를 변경합니다.</p>
                    </div>

                    <form onSubmit={handleChangePin} className="p-4 sm:p-6 space-y-4">
                        {/* 현재 비밀번호 */}
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">현재 비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPin}
                                    onChange={e => setCurrentPin(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm pr-10"
                                    placeholder="현재 비밀번호 입력"
                                    required
                                />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* 새 비밀번호 */}
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">새 비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm pr-10"
                                    placeholder="새 비밀번호 (4자 이상)"
                                    required
                                    minLength={4}
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* 새 비밀번호 확인 */}
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">새 비밀번호 확인</label>
                            <input
                                type="password"
                                value={confirmPin}
                                onChange={e => setConfirmPin(e.target.value)}
                                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm ${confirmPin && confirmPin !== newPin ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                                placeholder="새 비밀번호 다시 입력"
                                required
                            />
                            {confirmPin && confirmPin !== newPin && (
                                <p className="text-red-500 text-xs mt-1 font-medium">비밀번호가 일치하지 않습니다</p>
                            )}
                        </div>

                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-bold">
                                <CheckCircle2 className="w-5 h-5" /> 비밀번호가 성공적으로 변경되었습니다!
                            </div>
                        )}

                        <button type="submit" disabled={saving || (!!confirmPin && confirmPin !== newPin)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> 비밀번호 변경</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
