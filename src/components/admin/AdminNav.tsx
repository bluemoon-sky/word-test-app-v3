'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Users, Receipt, LogOut, ClipboardCheck } from 'lucide-react';

// 관리자 페이지 공통 내비게이션 바
export default function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: '/admin/words', label: '단어장', icon: BookOpen },
        { href: '/admin/users', label: '사용자', icon: Users },
        { href: '/admin/tests', label: '시험 승인', icon: ClipboardCheck },
        { href: '/admin/requests', label: '정산', icon: Receipt },
    ];

    const handleLogout = () => {
        localStorage.removeItem('isAdmin');
        router.push('/');
    };

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-8 flex items-center justify-between h-14 sm:h-16">
                <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                    <span className="text-lg font-black text-slate-800 mr-2 sm:mr-6 hidden md:block whitespace-nowrap">🔒 관리자</span>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${isActive
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                            >
                                <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1 whitespace-nowrap"
                >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">로그아웃</span>
                </button>
            </div>
        </nav>
    );
}
