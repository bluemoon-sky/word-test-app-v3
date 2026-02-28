'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Word, User } from '@/types';
import { Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminWordsPage() {
    const [words, setWords] = useState<Word[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 새 단어 폼 상태
    const [newWord, setNewWord] = useState('');
    const [newMeaning, setNewMeaning] = useState('');
    const [newPronun, setNewPronun] = useState('');
    const [newKoreanPronun, setNewKoreanPronun] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all'); // 'all' 이면 공통 단어
    const [isAdding, setIsAdding] = useState(false);

    // 수정 모드 상태
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWord, setEditWord] = useState('');
    const [editMeaning, setEditMeaning] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') !== 'true') {
            router.push('/admin');
            return;
        }
        fetchData();
    }, [router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 단어 가져오기
            const { data: wordsData, error: wordsError } = await supabase
                .from('words')
                .select('*')
                .order('created_at', { ascending: false });

            if (wordsError) throw wordsError;

            // 학생 목록 가져오기 (단어 할당용)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'kid')
                .order('nickname');

            if (usersError) throw usersError;

            setWords(wordsData as Word[]);
            setStudents(usersData as User[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWord.trim() || !newMeaning.trim()) return;

        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('words')
                .insert([{
                    word: newWord.trim(),
                    meaning: newMeaning.trim(),
                    pronunciation: newPronun.trim() || null,
                    korean_pronunciation: newKoreanPronun.trim() || null,
                    user_id: selectedStudentId === 'all' ? null : selectedStudentId
                }])
                .select()
                .single();

            if (error) throw error;

            setWords([data as Word, ...words]);

            // 폼 초기화
            setNewWord('');
            setNewMeaning('');
            setNewPronun('');
            setNewKoreanPronun('');
        } catch (error) {
            console.error('단어 추가 에러:', error);
            alert('단어 추가에 실패했습니다.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('정말 이 단어를 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase.from('words').delete().eq('id', id);
            if (error) throw error;
            setWords(words.filter(w => w.id !== id));
        } catch (error) {
            console.error('삭제 에러:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const startEdit = (word: Word) => {
        setEditingId(word.id);
        setEditWord(word.word);
        setEditMeaning(word.meaning);
    };

    const handleUpdate = async () => {
        if (!editingId || !editWord.trim() || !editMeaning.trim()) return;

        try {
            const { data, error } = await supabase
                .from('words')
                .update({
                    word: editWord.trim(),
                    meaning: editMeaning.trim(),
                })
                .eq('id', editingId)
                .select()
                .single();

            if (error) throw error;

            setWords(words.map(w => w.id === editingId ? (data as Word) : w));
            setEditingId(null);
        } catch (error) {
            console.error('수정 에러:', error);
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">데이터를 불러오는 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">단어장 관리 대시보드</h1>
                        <p className="text-slate-500 mt-1">학생들이 학습할 단어를 추가하고 관리하세요.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 단어 추가 폼 */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleAddWord} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                                <Plus className="w-5 h-5 mr-2 text-blue-500" /> 새 단어 추가
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">영단어 스펠링 *</label>
                                    <input
                                        type="text"
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                        placeholder="예: apple"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">한글 뜻 *</label>
                                    <input
                                        type="text"
                                        value={newMeaning}
                                        onChange={(e) => setNewMeaning(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                        placeholder="예: 사과"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">발음 기호 (선택)</label>
                                    <input
                                        type="text"
                                        value={newPronun}
                                        onChange={(e) => setNewPronun(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="예: [æpl]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">한국어 발음 *</label>
                                    <input
                                        type="text"
                                        value={newKoreanPronun}
                                        onChange={(e) => setNewKoreanPronun(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                        placeholder="예: 애플"
                                    />
                                    <p className="text-xs text-slate-500 mt-1 ml-1">영단어의 한국어 발음을 입력해 주세요.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">출제 대상 학생</label>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                                    >
                                        <option value="all">전체 학생 공통 출제</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.nickname} 학생 전용</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2 ml-1">특정 학생을 지정하면 해당 학생에게만 이 단어가 보여집니다.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="w-full mt-2 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-70"
                                >
                                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'DB에 단어 저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* 단어 리스트 테이블 */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-800">등록된 단어 목록</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">총 {words.length}개</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">영단어</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">한글 뜻</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">할당 대상</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {words.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    아직 등록된 단어가 없습니다. 왼쪽 폼에서 단어를 추가해 보세요!
                                                </td>
                                            </tr>
                                        ) : (
                                            words.map((word) => (
                                                <tr key={word.id} className="hover:bg-slate-50/50 transition-colors">

                                                    <td className="px-6 py-4">
                                                        {editingId === word.id ? (
                                                            <input
                                                                type="text"
                                                                value={editWord}
                                                                onChange={(e) => setEditWord(e.target.value)}
                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        ) : (
                                                            <div className="font-bold text-slate-800">
                                                                {word.word}
                                                                {word.pronunciation && <span className="ml-2 text-xs font-normal text-slate-400">{word.pronunciation}</span>}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {editingId === word.id ? (
                                                            <input
                                                                type="text"
                                                                value={editMeaning}
                                                                onChange={(e) => setEditMeaning(e.target.value)}
                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-600 font-medium">{word.meaning}</span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {word.user_id ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                {students.find(s => s.id === word.user_id)?.nickname || '특정 학생'} 전용
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                전체 공통
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {editingId === word.id ? (
                                                                <>
                                                                    <button onClick={handleUpdate} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="저장">
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="취소">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button onClick={() => startEdit(word)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(word.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>

                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
