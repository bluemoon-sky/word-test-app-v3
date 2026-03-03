'use client';

import { Home, BookOpen, FileX2, User } from 'lucide-react';

type Tab = 'home' | 'wordbook' | 'wrong_notes' | 'mypage';

type Props = {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
};

// 모바일 하단 네비게이션 바 컴포넌트
// 모든 탭 터치 타겟 최소 48px (h-12) 이상 보장
export default function BottomNav({ activeTab, onTabChange }: Props) {
    const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
        { key: 'home', label: '홈', icon: Home },
        { key: 'wordbook', label: '내 단어장', icon: BookOpen },
        { key: 'wrong_notes', label: '오답노트', icon: FileX2 },
        { key: 'mypage', label: '마이페이지', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="max-w-lg mx-auto flex">
                {tabs.map(({ key, label, icon: Icon }) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => onTabChange(key)}
                            className={`
                                flex-1 flex flex-col items-center justify-center
                                min-h-[56px] py-1.5 transition-all duration-200
                                ${isActive
                                    ? 'text-blue-600'
                                    : 'text-slate-400 active:text-slate-600'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                            <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                {label}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-1 w-6 h-0.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
