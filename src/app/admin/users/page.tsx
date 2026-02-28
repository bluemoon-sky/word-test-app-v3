'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import AdminNav from '@/components/admin/AdminNav';
import { Plus, Trash2, Loader2, Coins, UserPlus } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNickname, setNewNickname] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') !== 'true') {
            router.push('/admin');
            return;
        }
        fetchUsers();
    }, [router]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data as User[]);
        } catch (error) {
            console.error('사용자 불러오기 에러:', error);
        } finally {
            setLoading(false);
        }
    };

    // 사용자 추가
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNickname.trim()) return;

        setIsAdding(true);
        try {
            // 중복 닉네임 체크
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('nickname', newNickname.trim())
                .single();

            if (existing) {
                alert('이미 같은 이름의 사용자가 있습니다!');
                setIsAdding(false);
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .insert([{ nickname: newNickname.trim(), role: 'kid', tokens: 0 }])
                .select()
                .single();

            if (error) throw error;

            setUsers([data as User, ...users]);
            setNewNickname('');
        } catch (error) {
            console.error('사용자 추가 에러:', error);
            alert('사용자 추가에 실패했습니다.');
        } finally {
            setIsAdding(false);
        }
    };

    // 사용자 삭제
    const handleDeleteUser = async (id: string, nickname: string) => {
        if (!window.confirm(`정말 "${nickname}" 사용자를 삭제하시겠습니까?\n해당 사용자의 모든 단어 및 정산 기록도 같이 삭제됩니다.`)) return;

        try {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error('사용자 삭제 에러:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    // 토큰 수동 조정
    const handleAdjustTokens = async (id: string, currentTokens: number) => {
        const input = window.prompt(`현재 토큰: ${currentTokens}\n새롭게 설정할 토큰 수를 입력하세요:`, String(currentTokens));
        if (input === null) return;

        const newTokens = parseInt(input, 10);
        if (isNaN(newTokens) || newTokens < 0) {
            alert('0 이상의 숫자를 입력해 주세요.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .update({ tokens: newTokens })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setUsers(users.map(u => u.id === id ? (data as User) : u));
        } catch (error) {
            console.error('토큰 수정 에러:', error);
            alert('토큰 수정 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">사용자 관리</h1>
                        <p className="text-slate-500 mt-1">학생들을 추가하고 토큰 정보를 관리하세요.</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-sm font-bold text-blue-800">
                        총 {users.length}명 등록됨
                    </div>
                </div>

                {/* 사용자 추가 폼 */}
                <form onSubmit={handleAddUser} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                            <UserPlus className="w-4 h-4 inline mr-1" /> 새 사용자 추가
                        </label>
                        <input
                            type="text"
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            placeholder="학생 이름(닉네임) 입력..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isAdding}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
                    >
                        {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> 추가하기</>}
                    </button>
                </form>

                {/* 사용자 리스트 */}
                {loading ? (
                    <div className="p-8 text-center text-slate-500">데이터를 불러오는 중...</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600">이름(닉네임)</th>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600">역할</th>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600">보유 토큰</th>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600">환산 용돈</th>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600">가입일</th>
                                        <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                등록된 사용자가 없습니다. 위에서 학생을 추가해 보세요!
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 text-base">{user.nickname}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.role === 'admin' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">관리자</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">학생</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleAdjustTokens(user.id, user.tokens)}
                                                        className="flex items-center gap-1.5 text-yellow-700 font-bold hover:bg-yellow-50 px-3 py-1.5 rounded-lg transition-colors"
                                                        title="클릭하여 토큰 수 조정"
                                                    >
                                                        <Coins className="w-4 h-4 text-yellow-500" />
                                                        {user.tokens.toLocaleString()} T
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-emerald-600 font-semibold">
                                                    ₩ {(user.tokens * 10).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.nickname)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="사용자 삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
