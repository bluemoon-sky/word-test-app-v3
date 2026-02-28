'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ExchangeRequest } from '@/types';
import { CheckCircle, Clock } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<ExchangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') !== 'true') {
            router.push('/admin');
            return;
        }
        fetchRequests();
    }, [router]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            // users 테이블과 조인하여 학생 이름(nickname)을 가져옴
            const { data, error } = await supabase
                .from('exchange_requests')
                .select(`
          *,
          users ( id, nickname )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data as any);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const { error } = await supabase
                .from('exchange_requests')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setRequests((prev) =>
                prev.map((req) =>
                    req.id === id ? { ...req, status: 'completed', updated_at: new Date().toISOString() } : req
                )
            );
        } catch (error) {
            console.error('Error updating request:', error);
            alert('승인 처리 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNav />
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-slate-800">용돈 정산 관리</h1>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-600">학생 이름</th>
                                <th className="p-4 font-semibold text-slate-600">차감 토큰</th>
                                <th className="p-4 font-semibold text-slate-600">환산 금액(원)</th>
                                <th className="p-4 font-semibold text-slate-600">신청 일시</th>
                                <th className="p-4 font-semibold text-slate-600">상태</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        정산 요청 내역이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800">{req.users?.nickname || '알 수 없음'}</td>
                                        <td className="p-4 text-orange-600 font-semibold">{req.tokens_deducted} T</td>
                                        <td className="p-4 text-green-600 font-bold">{req.amount.toLocaleString()} 원</td>
                                        <td className="p-4 text-slate-500 text-sm">
                                            {new Date(req.created_at).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-4">
                                            {req.status === 'completed' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    지급 완료
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                                    대기 중
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {req.status === 'pending' && (
                                                <button
                                                    onClick={() => handleApprove(req.id)}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    지급 완료 처리
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
