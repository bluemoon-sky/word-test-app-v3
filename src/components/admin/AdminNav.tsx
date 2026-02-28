'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Users, Receipt, LogOut } from 'lucide-react';

// 관리자 페이지 공통 내비게이션 바
export default function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: '/admin/words', label: '단어장 관리', icon: BookOpen },
        { href: '/admin/users', label: '사용자 관리', icon: Users },
        { href: '/admin/requests', label: '정산 관리', icon: Receipt },
    ];

    const handleLogout = () => {
        localStorage.removeItem('isAdmin');
        router.push('/');
    };

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                <div className="flex items-center gap-1">
                    <span className="text-lg font-black text-slate-800 mr-6 hidden md:block">🔒 관리자</span>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isActive
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline">로그아웃</span>
                </button>
            </div>
        </nav>
    );
}
