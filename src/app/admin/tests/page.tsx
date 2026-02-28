'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TestRequest } from '@/types';
import AdminNav from '@/components/admin/AdminNav';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

export default function AdminTestApprovalsPage() {
    const [requests, setRequests] = useState<TestRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') !== 'true') {
            router.push('/admin');
            return;
        }
        fetchRequests();

        // 5초마다 자동 새로고침 (실시간 반영)
        const interval = setInterval(fetchRequests, 5000);
        return () => clearInterval(interval);
    }, [router]);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('test_requests')
                .select(`*, users ( id, nickname )`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data as any);
        } catch (error) {
            console.error('시험 요청 불러오기 에러:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const { error } = await supabase
                .from('test_requests')
                .update({ status: 'approved' })
                .eq('id', id);

            if (error) throw error;
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        } catch (error) {
            console.error('승인 에러:', error);
            alert('승인 처리 중 오류 발생');
        }
    };

    const handleReject = async (id: string) => {
        try {
            const { error } = await supabase
                .from('test_requests')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        } catch (error) {
            console.error('거절 에러:', error);
            alert('거절 처리 중 오류 발생');
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === 'pending') return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Clock className="w-3 h-3 mr-1" /> 대기 중
            </span>
        );
        if (status === 'approved') return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" /> 승인됨
            </span>
        );
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" /> 거절됨
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <div className="p-3 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-slate-800">시험 승인 관리</h1>
                        <p className="text-xs sm:text-base text-slate-500 mt-1">학생들의 시험 요청을 확인하고 승인해 주세요.</p>
                    </div>
                    {pendingCount > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-bold text-amber-800 animate-pulse">
                            ⏳ 대기 중 {pendingCount}건
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> 로딩 중...
                    </div>
                ) : (
                    <>
                        {/* 모바일 카드 레이아웃 */}
                        <div className="block sm:hidden space-y-3">
                            {requests.length === 0 ? (
                                <div className="bg-white rounded-xl p-6 text-center text-slate-500 border border-slate-200">
                                    시험 요청이 없습니다.
                                </div>
                            ) : (
                                requests.map((req) => (
                                    <div key={req.id} className={`bg-white rounded-xl border p-4 shadow-sm ${req.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-800">{req.users?.nickname || '알 수 없음'}</span>
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <div className="text-xs text-slate-500 mb-3">
                                            {new Date(req.created_at).toLocaleDateString('ko-KR', {
                                                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(req.id)}
                                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                                >
                                                    ✅ 승인
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                                >
                                                    ❌ 거절
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 데스크톱 테이블 레이아웃 */}
                        <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">학생 이름</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">요청 시각</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600">상태</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {requests.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    시험 요청이 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            requests.map((req) => (
                                                <tr key={req.id} className={`hover:bg-slate-50/50 transition-colors ${req.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-slate-800 text-base">{req.users?.nickname || '알 수 없음'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {new Date(req.created_at).toLocaleDateString('ko-KR', {
                                                            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={req.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {req.status === 'pending' && (
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => handleApprove(req.id)}
                                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                                                                >
                                                                    ✅ 승인
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(req.id)}
                                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                                                                >
                                                                    ❌ 거절
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                <p className="text-xs text-slate-400 text-center">이 페이지는 5초마다 자동으로 새로고침됩니다.</p>
            </div>
        </div>
    );
}
