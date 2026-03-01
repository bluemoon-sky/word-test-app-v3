'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Word, User } from '@/types';
import {
    Plus, Trash2, Edit2, Loader2, Save, X, Upload, CheckCircle2,
    Search, ChevronLeft, ChevronRight, ArrowUpDown, Link as LinkIcon, FileSpreadsheet
} from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminWordsPage() {
    const [words, setWords] = useState<Word[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // ─── 듀얼 탭 상태 ───
    const [activeTab, setActiveTab] = useState<'single' | 'csv'>('single');

    // ─── 새 단어 폼 상태 (탭 A: 직접 입력) ───
    const [newWord, setNewWord] = useState('');
    const [newMeaning, setNewMeaning] = useState('');
    const [newMeaning2, setNewMeaning2] = useState('');
    const [newPronun, setNewPronun] = useState('');
    const [newKoreanPronun, setNewKoreanPronun] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
    const [isAdding, setIsAdding] = useState(false);

    // ─── CSV/URL 업로드 상태 (탭 B) ───
    const [csvPreview, setCsvPreview] = useState<Partial<Word>[]>([]);
    const [isUploadingCSV, setIsUploadingCSV] = useState(false);
    const [csvCategory, setCsvCategory] = useState('');
    const [csvUrl, setCsvUrl] = useState('');
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);

    // ─── 수정 모드 상태 ───
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWord, setEditWord] = useState('');
    const [editMeaning, setEditMeaning] = useState('');
    const [editMeaning2, setEditMeaning2] = useState('');
    const [editKoreanPronun, setEditKoreanPronun] = useState('');
    const [editCategory, setEditCategory] = useState('');

    // ─── 데이터 테이블 상태 ───
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortField, setSortField] = useState<'word' | 'created_at'>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    // ─── 데이터 가져오기 ───
    useEffect(() => {
        const isAdmin = localStorage.getItem('isAdmin');
        if (!isAdmin) { router.push('/admin'); return; }

        const fetchData = async () => {
            try {
                const [wordsRes, studentsRes] = await Promise.all([
                    supabase.from('words').select('*').order('created_at', { ascending: false }),
                    supabase.from('users').select('*').eq('role', 'kid')
                ]);
                if (wordsRes.data) setWords(wordsRes.data as Word[]);
                if (studentsRes.data) setStudents(studentsRes.data as User[]);
            } catch (error) {
                console.error('데이터 로딩 에러:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    // ─── 카테고리 목록 추출 ───
    const categories = useMemo(() => {
        const cats = new Set<string>();
        words.forEach(w => { if (w.category) cats.add(w.category); });
        return Array.from(cats).sort();
    }, [words]);

    // ─── 필터링, 정렬, 페이지네이션 ───
    const filteredAndSorted = useMemo(() => {
        let result = [...words];

        // 검색
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(w =>
                w.word.toLowerCase().includes(q) ||
                w.meaning_1.toLowerCase().includes(q) ||
                (w.meaning_2 && w.meaning_2.toLowerCase().includes(q))
            );
        }

        // 카테고리 필터
        if (filterCategory) {
            result = result.filter(w => w.category === filterCategory);
        }

        // 정렬
        result.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'word') {
                cmp = a.word.localeCompare(b.word);
            } else {
                cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [words, searchQuery, filterCategory, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
    const pagedWords = filteredAndSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // 검색/필터 변경 시 페이지 리셋
    useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory, sortField, sortDir]);

    // ─── 단어 추가 (탭 A) ───
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
                    category: newCategory.trim() || null,
                    user_id: selectedStudentId === 'all' ? null : selectedStudentId
                }])
                .select()
                .single();

            if (error) throw error;
            setWords([data as Word, ...words]);
            setNewWord(''); setNewMeaning(''); setNewMeaning2('');
            setNewPronun(''); setNewKoreanPronun('');
        } catch (error) {
            console.error('추가 에러:', error);
            alert('단어 추가 중 오류가 발생했습니다.');
        } finally {
            setIsAdding(false);
        }
    };

    // ─── 삭제 ───
    const handleDelete = async (id: string) => {
        if (!confirm('이 단어를 정말 삭제할까요?')) return;
        try {
            const { error } = await supabase.from('words').delete().eq('id', id);
            if (error) throw error;
            setWords(words.filter(w => w.id !== id));
        } catch (error) {
            console.error('삭제 에러:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    // ─── 수정 ───
    const startEdit = (word: Word) => {
        setEditingId(word.id);
        setEditWord(word.word);
        setEditMeaning(word.meaning_1);
        setEditMeaning2(word.meaning_2 || '');
        setEditKoreanPronun(word.korean_pronunciation || '');
        setEditCategory(word.category || '');
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
                    category: editCategory.trim() || null,
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

    // ─── CSV 파일 파싱 ───
    const parseCSVText = (text: string) => {
        // UTF-8 BOM 제거
        const cleanedText = text.replace(/^\uFEFF/, '');
        const lines = cleanedText.split('\n').map(line => line.replace(/\r/g, ''));
        const parsedWords: Partial<Word>[] = [];

        // 첫 번째 줄은 항상 헤더이므로 무조건 스킵 (i = 1부터 시작)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (val: string) => {
                let cleaned = val?.trim() || '';
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                    cleaned = cleaned.substring(1, cleaned.length - 1);
                }
                return cleaned;
            };

            // 사용자 지정 컬럼: DAY, 영단어, 뜻1, 뜻2, 발음기호, 한국어발음
            // (만약 5칼럼이라면 첫 번째가 영단어, 6칼럼이면 첫 번째가 DAY)
            let w = '', m1 = '', m2 = '', phon = '', kPro = '', cat = csvCategory.trim();

            if (cols.length >= 6) {
                // 6열 형식 (DAY 포함)
                if (clean(cols[0])) cat = clean(cols[0]); // DAY가 있으면 카테고리 덮어쓰기
                w = clean(cols[1]);
                m1 = clean(cols[2]);
                m2 = clean(cols[3]);
                phon = clean(cols[4]);
                kPro = clean(cols[5]);
            } else {
                // 기존 5열 형식 백폴 (영단어, 뜻1, 뜻2, 발음기호, 한국어발음)
                w = clean(cols[0]);
                m1 = clean(cols[1]);
                m2 = clean(cols[2]);
                phon = clean(cols[3]);
                kPro = clean(cols[4]);
            }

            if (w && m1) {
                parsedWords.push({
                    word: w,
                    meaning_1: m1,
                    meaning_2: m2 || null,
                    phonetic: phon || null,
                    korean_pronunciation: kPro || null,
                    category: cat || null,
                    user_id: selectedStudentId === 'all' ? null : selectedStudentId
                });
            }
        }
        return parsedWords;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSVText(text);
            if (parsed.length > 0) {
                setCsvPreview(parsed);
            } else {
                alert('파싱할 수 있는 유효한 단어가 없습니다. 형식을 확인해주세요.');
            }
        };
        reader.readAsText(file);
    };

    // ─── URL에서 CSV 가져오기 ───
    const handleFetchUrl = async () => {
        if (!csvUrl.trim()) return;
        setIsFetchingUrl(true);
        try {
            const res = await fetch(csvUrl.trim());
            if (!res.ok) throw new Error('URL 요청 실패');
            const text = await res.text();
            const parsed = parseCSVText(text);
            if (parsed.length > 0) {
                setCsvPreview(parsed);
            } else {
                alert('해당 URL에서 유효한 단어 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('URL fetch 에러:', error);
            alert('CSV URL을 불러오는 데 실패했습니다. URL을 확인해주세요.');
        } finally {
            setIsFetchingUrl(false);
        }
    };

    // ─── DB 일괄 저장 ───
    const handleBulkInsert = async () => {
        if (csvPreview.length === 0) return;
        setIsUploadingCSV(true);
        try {
            // Supabase는 한 번에 1000개까지만 INSERT 가능하므로 나눠서 처리
            const chunkSize = 500;
            const allInserted: Word[] = [];
            for (let i = 0; i < csvPreview.length; i += chunkSize) {
                const chunk = csvPreview.slice(i, i + chunkSize);
                const { data, error } = await supabase
                    .from('words')
                    .insert(chunk as Word[])
                    .select();
                if (error) throw error;
                allInserted.push(...(data as Word[]));
            }

            setWords([...allInserted, ...words]);
            setCsvPreview([]);
            setCsvUrl('');
            alert(`${allInserted.length}개의 단어가 성공적으로 저장되었습니다!`);
        } catch (error) {
            console.error('CSV Bulk Insert Error:', error);
            alert('데이터 일괄 저장에 실패했습니다.');
        } finally {
            setIsUploadingCSV(false);
        }
    };

    // ─── 정렬 토글 ───
    const toggleSort = (field: 'word' | 'created_at') => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">데이터를 불러오는 중...</div>;

    // ─── 할당 대상 배지 ───
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
            <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-xl sm:text-3xl font-black text-slate-800">단어장 관리 대시보드</h1>
                    <p className="text-xs sm:text-base text-slate-500 mt-1">총 {words.length}개의 단어를 관리하고 있습니다.</p>
                </div>

                {/* ── 듀얼 탭 입력 영역 ── */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* 탭 헤더 */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('single')}
                            className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'single' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Plus className="w-4 h-4" /> 직접 입력
                        </button>
                        <button
                            onClick={() => setActiveTab('csv')}
                            className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'csv' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileSpreadsheet className="w-4 h-4" /> 구글 시트 / CSV 연동
                        </button>
                    </div>

                    {/* 탭 A: 직접 입력 */}
                    {activeTab === 'single' && (
                        <form onSubmit={handleAddWord} className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">영단어 *</label>
                                    <input type="text" value={newWord} onChange={e => setNewWord(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm" placeholder="apple" required />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">한글 뜻 1 *</label>
                                    <input type="text" value={newMeaning} onChange={e => setNewMeaning(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm" placeholder="사과" required />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">한글 뜻 2</label>
                                    <input type="text" value={newMeaning2} onChange={e => setNewMeaning2(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm" placeholder="능금" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">발음 기호</label>
                                    <input type="text" value={newPronun} onChange={e => setNewPronun(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" placeholder="[æpl]" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">한국어 발음</label>
                                    <input type="text" value={newKoreanPronun} onChange={e => setNewKoreanPronun(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm" placeholder="애플" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">카테고리</label>
                                    <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm" placeholder="Day 1" />
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 mt-4 items-end">
                                <div className="w-full sm:w-auto sm:min-w-[200px]">
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">출제 대상</label>
                                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 text-sm">
                                        <option value="all">전체 공통</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.nickname} 전용</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={isAdding}
                                    className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-sm">
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 단어 저장
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 탭 B: 구글 시트 / CSV 연동 */}
                    {activeTab === 'csv' && (
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">카테고리 (일괄 적용)</label>
                                    <input type="text" value={csvCategory} onChange={e => setCsvCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm" placeholder="Day 1" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">출제 대상</label>
                                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700 text-sm">
                                        <option value="all">전체 공통</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.nickname} 전용</option>)}
                                    </select>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500">
                                CSV 열 순서: <strong>영단어, 뜻1(필수), 뜻2, 발음기호, 한국어발음</strong>. 카테고리는 위 입력란에서 일괄 지정됩니다.
                            </p>

                            {/* 방법 1: 파일 업로드 */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <Upload className="w-4 h-4 text-emerald-600" /> 방법 1: CSV 파일 업로드
                                </h3>
                                <input type="file" accept=".csv" onChange={handleFileUpload}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors cursor-pointer" />
                            </div>

                            {/* 방법 2: URL 입력 */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <LinkIcon className="w-4 h-4 text-emerald-600" /> 방법 2: 웹에 게시된 CSV 링크
                                </h3>
                                <div className="flex gap-2">
                                    <input type="url" value={csvUrl} onChange={e => setCsvUrl(e.target.value)}
                                        className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
                                    <button onClick={handleFetchUrl} disabled={isFetchingUrl || !csvUrl.trim()}
                                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                                        {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 불러오기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── CSV 미리보기 테이블 ── */}
                {csvPreview.length > 0 && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-emerald-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                            <h3 className="text-sm sm:text-lg font-bold text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> CSV 파싱 미리보기 ({csvPreview.length}개)
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => setCsvPreview([])}
                                    className="px-3 py-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
                                    초기화
                                </button>
                                <button onClick={handleBulkInsert} disabled={isUploadingCSV}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center disabled:opacity-70 gap-2">
                                    {isUploadingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    DB 일괄 저장 ({csvPreview.length}개)
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 text-slate-600">영단어</th>
                                        <th className="px-3 py-2 text-slate-600">뜻1</th>
                                        <th className="px-3 py-2 text-slate-600">뜻2</th>
                                        <th className="px-3 py-2 text-slate-600">발음기호</th>
                                        <th className="px-3 py-2 text-slate-600">한국어발음</th>
                                        <th className="px-3 py-2 text-slate-600">카테고리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {csvPreview.slice(0, 100).map((word, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-3 py-2 font-bold text-slate-800">{word.word}</td>
                                            <td className="px-3 py-2 text-slate-600">{word.meaning_1}</td>
                                            <td className="px-3 py-2 text-slate-500">{word.meaning_2 || '-'}</td>
                                            <td className="px-3 py-2 text-slate-500">{word.phonetic || '-'}</td>
                                            <td className="px-3 py-2 text-blue-600">{word.korean_pronunciation || '-'}</td>
                                            <td className="px-3 py-2 text-purple-600">{word.category || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvPreview.length > 100 && (
                                <p className="px-3 py-2 text-xs text-slate-500 bg-slate-50 text-center">... 외 {csvPreview.length - 100}개 (미리보기는 상위 100개만 표시)</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── 단어 목록 Data Table ── */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* 검색 / 필터 / 정렬 툴바 */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* 검색 */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" placeholder="영단어 또는 한글 뜻 검색..." />
                            </div>
                            {/* 카테고리 필터 */}
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 min-w-[140px]">
                                <option value="">전체 카테고리</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{filteredAndSorted.length}개 단어 · {currentPage}/{totalPages} 페이지</span>
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('word')}>
                                        <span className="flex items-center gap-1">영단어 <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">한글 뜻</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 hidden md:table-cell">발음</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 hidden lg:table-cell">카테고리</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 hidden lg:table-cell">할당</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('created_at')}>
                                        <span className="flex items-center gap-1">등록일 <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagedWords.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">표시할 단어가 없습니다.</td></tr>
                                ) : pagedWords.map(word => (
                                    <tr key={word.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {editingId === word.id ? (
                                                <input type="text" value={editWord} onChange={e => setEditWord(e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                            ) : (
                                                <div>
                                                    <span className="font-bold text-slate-800">{word.word}</span>
                                                    {word.korean_pronunciation && <span className="ml-1.5 text-[10px] font-bold text-blue-500">[{word.korean_pronunciation}]</span>}
                                                    {word.phonetic && <span className="ml-1 text-[10px] text-slate-400">{word.phonetic}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === word.id ? (
                                                <div className="space-y-1">
                                                    <input type="text" value={editMeaning} onChange={e => setEditMeaning(e.target.value)}
                                                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="뜻1" />
                                                    <input type="text" value={editMeaning2} onChange={e => setEditMeaning2(e.target.value)}
                                                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500" placeholder="뜻2 (선택)" />
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">
                                                    {word.meaning_1}
                                                    {word.meaning_2 && <span className="ml-1 text-xs text-slate-400">/ {word.meaning_2}</span>}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {editingId === word.id ? (
                                                <input type="text" value={editKoreanPronun} onChange={e => setEditKoreanPronun(e.target.value)} placeholder="한국어 발음"
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                            ) : (
                                                <span className="text-xs text-slate-500">{word.korean_pronunciation || '-'}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            {editingId === word.id ? (
                                                <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="카테고리"
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                            ) : (
                                                word.category ? <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">{word.category}</span> : <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <AssignBadge userId={word.user_id} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400" suppressHydrationWarning>
                                            {new Date(word.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {editingId === word.id ? (
                                                    <>
                                                        <button onClick={handleUpdate} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="저장">
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="취소">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(word)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(word.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
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

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-1 flex-wrap">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p - (arr[idx - 1] as number)) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) => typeof p === 'string' ? (
                                    <span key={`dot-${idx}`} className="px-2 text-slate-400">...</span>
                                ) : (
                                    <button key={p} onClick={() => setCurrentPage(p)}
                                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${currentPage === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                                        {p}
                                    </button>
                                ))}
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
