'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Word, User } from '@/types';
import { Plus, Trash2, Edit2, Loader2, Save, X, Upload, CheckCircle2 } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminWordsPage() {
    const [words, setWords] = useState<Word[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 새 단어 폼 상태
    const [newWord, setNewWord] = useState('');
    const [newMeaning, setNewMeaning] = useState('');
    const [newMeaning2, setNewMeaning2] = useState('');
    const [newPronun, setNewPronun] = useState('');
    const [newKoreanPronun, setNewKoreanPronun] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all'); // 'all' 이면 공통 단어
    const [isAdding, setIsAdding] = useState(false);

    // CSV 일괄 업로드 상태
    const [csvPreview, setCsvPreview] = useState<Partial<Word>[]>([]);
    const [isUploadingCSV, setIsUploadingCSV] = useState(false);

    // 수정 모드 상태
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWord, setEditWord] = useState('');
    const [editMeaning, setEditMeaning] = useState('');
    const [editMeaning2, setEditMeaning2] = useState('');
    const [editKoreanPronun, setEditKoreanPronun] = useState('');

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
            const { data: wordsData, error: wordsError } = await supabase
                .from('words')
                .select('*')
                .order('created_at', { ascending: false });

            if (wordsError) throw wordsError;

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
                    meaning_1: newMeaning.trim(),
                    meaning_2: newMeaning2.trim() || null,
                    phonetic: newPronun.trim() || null,
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
            setNewMeaning2('');
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
        setEditMeaning(word.meaning_1);
        setEditMeaning2(word.meaning_2 || '');
        setEditKoreanPronun(word.korean_pronunciation || '');
    };

    const handleUpdate = async () => {
        if (!editingId || !editWord.trim() || !editMeaning.trim()) return;

        try {
            const { data, error } = await supabase
                .from('words')
                .update({
                    word: editWord.trim(),
                    meaning_1: editMeaning.trim(),
                    meaning_2: editMeaning2.trim() || null,
                    korean_pronunciation: editKoreanPronun.trim() || null,
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

    // CSV 파일 파싱
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            // 줄바꿈으로 나누기. \r 제거
            const lines = text.split('\n').map(line => line.replace(/\r/g, ''));
            const parsedWords: Partial<Word>[] = [];

            // 최소 1줄 이상
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                // 쉼표 분리 (단순화: 엑셀에서 큰따옴표 이스케이프 된 경우 복잡해지므로, 기본 정규식 사용)
                // "a,b", c 형태를 파싱하기 위한 정규식
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

                // 따옴표 제거 헬퍼
                const clean = (val: string) => {
                    let cleaned = val?.trim() || '';
                    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                        cleaned = cleaned.substring(1, cleaned.length - 1);
                    }
                    return cleaned;
                };

                const w = clean(cols[0]);
                const m1 = clean(cols[1]); // 필수

                if (w && m1) {
                    parsedWords.push({
                        word: w,
                        meaning_1: m1,
                        meaning_2: clean(cols[2]) || null,
                        phonetic: clean(cols[3]) || null,
                        korean_pronunciation: clean(cols[4]) || null,
                        user_id: selectedStudentId === 'all' ? null : selectedStudentId
                    });
                }
            }

            if (parsedWords.length > 0) {
                setCsvPreview(parsedWords);
            } else {
                alert('파싱할 수 있는 유효한 단어가 없습니다. 형식을 확인해주세요.');
            }
        };
        reader.readAsText(file);
    };

    // DB 일괄 저장
    const handleBulkInsert = async () => {
        if (csvPreview.length === 0) return;
        setIsUploadingCSV(true);
        try {
            const { data, error } = await supabase
                .from('words')
                .insert(csvPreview as Word[])
                .select();

            if (error) throw error;

            // 성공 시 리스트 갱신 및 초기화
            setWords([...(data as Word[]), ...words]);
            setCsvPreview([]);
            alert(`${data.length}개의 단어가 성공적으로 저장되었습니다!`);
        } catch (error) {
            console.error('CSV Bulk Insert Error:', error);
            alert('데이터 일괄 저장에 실패했습니다.');
        } finally {
            setIsUploadingCSV(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">데이터를 불러오는 중...</div>;

    // 할당 대상 배지 컴포넌트
    const AssignBadge = ({ userId }: { userId: string | null | undefined }) => {
        if (userId) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800">
                    {students.find(s => s.id === userId)?.nickname || '특정 학생'} 전용
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800">
                전체 공통
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <div className="p-3 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-slate-800">단어장 관리 대시보드</h1>
                        <p className="text-xs sm:text-base text-slate-500 mt-1">학생들이 학습할 단어를 추가하고 관리하세요.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                    {/* 단어 추가 폼 */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleAddWord} className="bg-white p-4 sm:p-6 mb-4 xl:mb-0 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 lg:sticky lg:top-20">
                            <h2 className="text-base sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center">
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-500" /> 새 단어 1개 등록
                            </h2>

                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">영단어 스펠링 *</label>
                                    <input
                                        type="text"
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                                        placeholder="예: apple"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">한글 뜻 *</label>
                                    <input
                                        type="text"
                                        value={newMeaning}
                                        onChange={(e) => setNewMeaning(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                                        placeholder="예: 사과"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">두 번째 한글 뜻 (선택)</label>
                                    <input
                                        type="text"
                                        value={newMeaning2}
                                        onChange={(e) => setNewMeaning2(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                                        placeholder="예: 능금"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">발음 기호 (선택)</label>
                                    <input
                                        type="text"
                                        value={newPronun}
                                        onChange={(e) => setNewPronun(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
                                        placeholder="예: [æpl]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">한국어 발음 (선택)</label>
                                    <input
                                        type="text"
                                        value={newKoreanPronun}
                                        onChange={(e) => setNewKoreanPronun(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm sm:text-base"
                                        placeholder="예: 애플"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">출제 대상 학생</label>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700 text-sm sm:text-base"
                                    >
                                        <option value="all">전체 학생 공통 출제</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.nickname} 학생 전용</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 ml-1">특정 학생을 지정하면 해당 학생에게만 보여집니다.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="w-full mt-1 sm:mt-2 py-3 sm:py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-70 text-sm sm:text-base"
                                >
                                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'DB에 단어 저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* CSV 업로드 및 파싱 트리 & 미리보기 */}
                    {csvPreview.length > 0 && (
                        <div className="lg:col-span-3 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-emerald-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm sm:text-lg font-bold text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> CSV 파싱 미리보기 ({csvPreview.length}개)
                                </h3>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => setCsvPreview([])}
                                        className="px-3 py-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        초기화
                                    </button>
                                    <button
                                        onClick={handleBulkInsert}
                                        disabled={isUploadingCSV}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex border-none items-center disabled:opacity-70 gap-2"
                                    >
                                        {isUploadingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        DB 일괄 저장 시작
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2 text-slate-600">영단어(Word)</th>
                                            <th className="px-3 py-2 text-slate-600">뜻1(Meaning 1)</th>
                                            <th className="px-3 py-2 text-slate-600">뜻2(Meaning 2)</th>
                                            <th className="px-3 py-2 text-slate-600">발음기호(Phonetic)</th>
                                            <th className="px-3 py-2 text-slate-600">한국어발음(Kor Pronun)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {csvPreview.map((word, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2 font-bold text-slate-800">{word.word}</td>
                                                <td className="px-3 py-2 text-slate-600">{word.meaning_1}</td>
                                                <td className="px-3 py-2 text-slate-500">{word.meaning_2 || '-'}</td>
                                                <td className="px-3 py-2 text-slate-500">{word.phonetic || '-'}</td>
                                                <td className="px-3 py-2 text-blue-600">{word.korean_pronunciation || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 단어 리스트 */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-base sm:text-xl font-bold text-slate-800">등록된 단어 목록</h2>
                                <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full">총 {words.length}개</span>
                            </div>

                            {words.length === 0 ? (
                                <div className="px-6 py-12 text-center text-slate-500 text-sm sm:text-base">
                                    아직 등록된 단어가 없습니다. 위에서 단어를 추가해 보세요!
                                </div>
                            ) : (
                                <>
                                    {/* 모바일 카드 레이아웃 */}
                                    <div className="block sm:hidden divide-y divide-slate-100">
                                        {words.map((word) => (
                                            <div key={word.id} className="p-3">
                                                {editingId === word.id ? (
                                                    // 수정 모드
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={editWord}
                                                            onChange={(e) => setEditWord(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder="영단어"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editMeaning}
                                                            onChange={(e) => setEditMeaning(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder="한글 뜻"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editMeaning2}
                                                            onChange={(e) => setEditMeaning2(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder="두 번째 뜻 (선택)"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editKoreanPronun}
                                                            onChange={(e) => setEditKoreanPronun(e.target.value)}
                                                            placeholder="한국어 발음"
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                        />
                                                        <div className="flex gap-2 pt-1">
                                                            <button onClick={handleUpdate} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">저장</button>
                                                            <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">취소</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // 보기 모드
                                                    <div>
                                                        <div className="flex items-start justify-between mb-1.5">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-bold text-slate-800 text-sm">{word.word}</span>
                                                                {word.korean_pronunciation && <span className="ml-1.5 text-[10px] font-bold text-blue-500">[{word.korean_pronunciation}]</span>}
                                                                {word.phonetic && <span className="ml-1 text-[10px] text-slate-400">{word.phonetic}</span>}
                                                            </div>
                                                            <div className="flex gap-1 shrink-0 ml-2">
                                                                <button onClick={() => startEdit(word)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDelete(word.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-600 text-xs">
                                                                {word.meaning_1} {word.meaning_2 && <span className="text-slate-400">/ {word.meaning_2}</span>}
                                                            </span>
                                                            <AssignBadge userId={word.user_id} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* 데스크톱 테이블 레이아웃 */}
                                    <div className="hidden sm:block overflow-x-auto">
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
                                                {words.map((word) => (
                                                    <tr key={word.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            {editingId === word.id ? (
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editWord}
                                                                        onChange={(e) => setEditWord(e.target.value)}
                                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={editKoreanPronun}
                                                                        onChange={(e) => setEditKoreanPronun(e.target.value)}
                                                                        placeholder="한국어 발음"
                                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="font-bold text-slate-800">
                                                                    {word.word}
                                                                    {word.korean_pronunciation && <span className="ml-2 text-xs font-bold text-blue-500">[{word.korean_pronunciation}]</span>}
                                                                    {word.phonetic && <span className="ml-2 text-xs font-normal text-slate-400">{word.phonetic}</span>}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            {editingId === word.id ? (
                                                                <div className="space-y-1">
                                                                    <input
                                                                        type="text"
                                                                        value={editMeaning}
                                                                        onChange={(e) => setEditMeaning(e.target.value)}
                                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={editMeaning2}
                                                                        onChange={(e) => setEditMeaning2(e.target.value)}
                                                                        placeholder="두 번째 뜻 (선택)"
                                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-600 font-medium">
                                                                    {word.meaning_1}
                                                                    {word.meaning_2 && <span className="ml-1.5 text-xs text-slate-400">/ {word.meaning_2}</span>}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <AssignBadge userId={word.user_id} />
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
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
