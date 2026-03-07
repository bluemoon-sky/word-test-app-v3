'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, CalendarHeart, Flame, Star, Trophy } from 'lucide-react';

// ============================================================================
// 1. 20단계 햄스터 진화 로직
// ============================================================================
export const HAMSTER_STAGES = [
    // 🐣 브론즈 (Lv 1~5)
    { level: 1, minDays: 0, minWords: 0, title: '갓 태어난', name: '점박이 햄스터' },
    { level: 2, minDays: 1, minWords: 5, title: '눈을 뜬', name: '호기심 햄스터' },
    { level: 3, minDays: 2, minWords: 15, title: '뒤뚱뒤뚱', name: '아기 햄스터' },
    { level: 4, minDays: 3, minWords: 30, title: '해바라기씨', name: '발견자 햄스터' },
    { level: 5, minDays: 4, minWords: 50, title: '볼따구 빵빵', name: '먹보 햄스터' },
    // 🥈 실버 (Lv 6~10)
    { level: 6, minDays: 6, minWords: 80, title: '체력 증진', name: '런닝 햄스터' },
    { level: 7, minDays: 8, minWords: 120, title: '잔머리 굴리는', name: '천재 햄스터' },
    { level: 8, minDays: 11, minWords: 170, title: '호기심 천국', name: '탐정 햄스터' },
    { level: 9, minDays: 14, minWords: 230, title: '야외 체질', name: '탐험가 햄스터' },
    { level: 10, minDays: 17, minWords: 300, title: '열공 모드', name: '선비 햄스터' },
    // 🥇 골드 (Lv 11~15)
    { level: 11, minDays: 21, minWords: 380, title: '마법학교', name: '신입생 햄스터' },
    { level: 12, minDays: 25, minWords: 470, title: '지식의 수호자', name: '사서 햄스터' },
    { level: 13, minDays: 30, minWords: 570, title: '우주로 향하는', name: '로켓 햄스터' },
    { level: 14, minDays: 35, minWords: 680, title: '번개를 부르는', name: '마법사 햄스터' },
    { level: 15, minDays: 40, minWords: 800, title: '전설의 입문', name: '기사 햄스터' },
    // 🌈 무지개 (Lv 16~20)
    { level: 16, minDays: 46, minWords: 950, title: '시간을 거스르는', name: '현자 햄스터' },
    { level: 17, minDays: 52, minWords: 1100, title: '모든 것을 아는', name: '대현자 햄스터' },
    { level: 18, minDays: 59, minWords: 1250, title: '빛나는 왕관', name: '왕실 햄스터' },
    { level: 19, minDays: 67, minWords: 1400, title: '우주를 정복한', name: '은하계 햄스터' },
    { level: 20, minDays: 75, minWords: 1600, title: '신화가 된', name: '단어의 신 햄스터' },
];

function getStage(streak: number, words: number) {
    let current = HAMSTER_STAGES[0];
    for (const s of HAMSTER_STAGES) {
        if (streak >= s.minDays && words >= s.minWords) current = s;
    }
    return current;
}
function getNextStage(streak: number, words: number) {
    const st = getStage(streak, words);
    const idx = HAMSTER_STAGES.indexOf(st);
    return idx < HAMSTER_STAGES.length - 1 ? HAMSTER_STAGES[idx + 1] : null;
}

// ============================================================================
// 2. 말풍선 랜덤 대사
// ============================================================================
const BUBBLE_MESSAGES = [
    "앗, 간지러워 찌찍! >_<",
    "오늘도 단어 공부 파이팅!",
    "해바라기씨 먹고 싶다 뇸뇸",
    "다음 레벨로 가볼까요?!",
    "쓰다듬어줘서 고마워요 🐹",
    "찍찍! 천재가 된 기분이에요!",
    "조금만 더 하면 진화해요 🔥",
    "게이지가 쑥쑥 올라요!",
];

// ============================================================================
// 3. 티어별 테마 (배경/색상/게이지 등)
// ============================================================================
const getTheme = (level: number) => {
    if (level <= 5) return { bg: 'from-amber-50 via-orange-50/50 to-yellow-50/30', ring: 'border-orange-200', bar: 'from-orange-400 to-amber-500', title: 'text-orange-600', icon: 'text-orange-500', body: '#FFB347', belly: '#FFEACC', cheek: '#FF9999', ear: '#FFA07A' };
    if (level <= 10) return { bg: 'from-slate-50 via-blue-50/50 to-indigo-50/30', ring: 'border-blue-200', bar: 'from-blue-400 to-indigo-500', title: 'text-blue-600', icon: 'text-blue-500', body: '#A8C8E8', belly: '#DDE8F5', cheek: '#FFB0B0', ear: '#8BB8DE' };
    if (level <= 15) return { bg: 'from-yellow-50 via-amber-100/30 to-rose-50/30', ring: 'border-amber-300 shadow-lg', bar: 'from-amber-400 via-yellow-400 to-orange-500', title: 'text-amber-600', icon: 'text-amber-500', body: '#FFD700', belly: '#FFF5CC', cheek: '#FF8888', ear: '#FFB800' };
    return { bg: 'from-violet-50 via-fuchsia-50/50 to-cyan-50/50', ring: 'border-fuchsia-300 shadow-xl', bar: 'from-violet-500 via-fuchsia-500 to-cyan-500', title: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600', icon: 'text-fuchsia-500', body: '#C8A2FF', belly: '#EDE0FF', cheek: '#FFB0D0', ear: '#B88AE8' };
};

// ============================================================================
// 4. SVG 햄스터 캐릭터 컴포넌트 (순수 코드로 렌더링)
// ============================================================================
function HamsterSVG({ level, bounce, blink }: { level: number; bounce: boolean; blink: boolean }) {
    const theme = getTheme(level);
    const tier = level <= 5 ? 1 : level <= 10 ? 2 : level <= 15 ? 3 : 4;

    return (
        <svg
            viewBox="0 0 120 120"
            className={`w-full h-full transition-transform duration-300 ${bounce ? 'scale-110' : ''}`}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
            {/* 티어4: 후광 오라 효과 */}
            {tier === 4 && (
                <>
                    <circle cx="60" cy="65" r="50" fill="url(#auraGrad)" opacity="0.3">
                        <animate attributeName="r" values="48;52;48" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <defs>
                        <radialGradient id="auraGrad">
                            <stop offset="0%" stopColor="#C8A2FF" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>
                </>
            )}

            {/* 티어3+: 별 반짝이 효과 */}
            {tier >= 3 && (
                <>
                    <text x="18" y="28" fontSize="10" opacity="0.7">✨</text>
                    <text x="92" y="35" fontSize="8" opacity="0.5">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                        ✨
                    </text>
                    <text x="85" y="18" fontSize="6" opacity="0.4">⭐</text>
                </>
            )}

            {/* 귀 (왼쪽) */}
            <ellipse cx="38" cy="30" rx="12" ry="15" fill={theme.ear} stroke={theme.body} strokeWidth="1.5">
                <animateTransform attributeName="transform" type="rotate" values="-3,38,30;3,38,30;-3,38,30" dur="3s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="38" cy="30" rx="7" ry="10" fill={theme.cheek} opacity="0.5" />

            {/* 귀 (오른쪽) */}
            <ellipse cx="82" cy="30" rx="12" ry="15" fill={theme.ear} stroke={theme.body} strokeWidth="1.5">
                <animateTransform attributeName="transform" type="rotate" values="3,82,30;-3,82,30;3,82,30" dur="3s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="82" cy="30" rx="7" ry="10" fill={theme.cheek} opacity="0.5" />

            {/* 몸통 */}
            <ellipse cx="60" cy="72" rx="35" ry="30" fill={theme.body} />
            {/* 배 */}
            <ellipse cx="60" cy="78" rx="22" ry="18" fill={theme.belly} />

            {/* 얼굴 */}
            <circle cx="60" cy="55" r="28" fill={theme.body} />

            {/* 볼 터치 (장미빛 볼) */}
            <circle cx="40" cy="62" r="7" fill={theme.cheek} opacity="0.6" />
            <circle cx="80" cy="62" r="7" fill={theme.cheek} opacity="0.6" />

            {/* 눈 (깜빡임 애니메이션) */}
            {blink ? (
                <>
                    <line x1="48" y1="52" x2="56" y2="52" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="64" y1="52" x2="72" y2="52" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="50" cy="50" r="4.5" fill="#333" />
                    <circle cx="70" cy="50" r="4.5" fill="#333" />
                    {/* 눈 하이라이트 */}
                    <circle cx="52" cy="48" r="1.5" fill="white" />
                    <circle cx="72" cy="48" r="1.5" fill="white" />
                </>
            )}

            {/* 코 */}
            <ellipse cx="60" cy="58" rx="3" ry="2.5" fill="#FF7777" />

            {/* 입 */}
            <path d="M56 62 Q60 66 64 62" fill="none" stroke="#CC6666" strokeWidth="1.5" strokeLinecap="round" />

            {/* 수염 (왼쪽) */}
            <line x1="32" y1="58" x2="44" y2="56" stroke="#CCAA88" strokeWidth="1" opacity="0.6" />
            <line x1="30" y1="62" x2="44" y2="60" stroke="#CCAA88" strokeWidth="1" opacity="0.6" />

            {/* 수염 (오른쪽) */}
            <line x1="76" y1="56" x2="88" y2="58" stroke="#CCAA88" strokeWidth="1" opacity="0.6" />
            <line x1="76" y1="60" x2="90" y2="62" stroke="#CCAA88" strokeWidth="1" opacity="0.6" />

            {/* 발 */}
            <ellipse cx="45" cy="97" rx="10" ry="5" fill={theme.ear} />
            <ellipse cx="75" cy="97" rx="10" ry="5" fill={theme.ear} />

            {/* === 레벨별 악세서리 === */}

            {/* 실버 티어(Lv6~10): 머리띠 */}
            {tier === 2 && (
                <rect x="36" y="30" width="48" height="5" rx="2.5" fill="#FF6B6B" opacity="0.9" />
            )}

            {/* 골드 티어(Lv11~15): 마법사 모자 */}
            {tier === 3 && (
                <g>
                    {/* 모자 본체 */}
                    <polygon points="60,2 42,32 78,32" fill="#3B3B98" stroke="#FFD700" strokeWidth="1.5" />
                    {/* 모자 밴드 */}
                    <rect x="42" y="29" width="36" height="5" rx="2" fill="#FFD700" />
                    {/* 모자 꼭대기 별 */}
                    <text x="55" y="12" fontSize="10">⭐</text>
                </g>
            )}

            {/* 무지개 티어(Lv16~20): 왕관 */}
            {tier === 4 && (
                <g>
                    <polygon points="38,30 42,15 48,26 54,8 60,26 66,8 72,26 78,15 82,30" fill="#FFD700" stroke="#FFA500" strokeWidth="1" />
                    {/* 보석 */}
                    <circle cx="54" cy="22" r="2.5" fill="#FF4444" />
                    <circle cx="60" cy="18" r="3" fill="#4444FF" />
                    <circle cx="66" cy="22" r="2.5" fill="#44CC44" />
                </g>
            )}

            {/* 숨쉬기 움직임 (작은 상하 운동) */}
            <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;0,-2;0,0"
                dur="2.5s"
                repeatCount="indefinite"
            />
        </svg>
    );
}

// ============================================================================
// 5. 메인 PetAvatar 컴포넌트
// ============================================================================
type Props = {
    currentStreak: number;
    totalMasteredCount: number;
};

export default function PetAvatar({ currentStreak, totalMasteredCount }: Props) {
    const stage = getStage(currentStreak, totalMasteredCount);
    const next = getNextStage(currentStreak, totalMasteredCount);
    const theme = getTheme(stage.level);

    const [bounce, setBounce] = useState(false);
    const [blink, setBlink] = useState(false);
    const [msgIndex, setMsgIndex] = useState(-1);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    // 주기적 눈 깜빡임 (3~5초 간격, 0.15초 감았다 뜸)
    useEffect(() => {
        const blinkLoop = () => {
            setBlink(true);
            setTimeout(() => setBlink(false), 150);
        };
        const id = setInterval(blinkLoop, 3000 + Math.random() * 2000);
        return () => clearInterval(id);
    }, []);

    const needDays = next ? Math.max(0, next.minDays - currentStreak) : 0;
    const needWords = next ? Math.max(0, next.minWords - totalMasteredCount) : 0;
    const daysPct = next ? Math.min(Math.max((currentStreak / next.minDays) * 100, 0), 100) : 100;
    const wordsPct = next ? Math.min(Math.max((totalMasteredCount / next.minWords) * 100, 0), 100) : 100;

    const handleInteract = useCallback(() => {
        if (bounce) return;
        setBounce(true);
        let newIdx: number;
        do { newIdx = Math.floor(Math.random() * BUBBLE_MESSAGES.length); } while (newIdx === msgIndex);
        setMsgIndex(newIdx);
        setTimeout(() => setBounce(false), 500);
    }, [bounce, msgIndex]);

    const getDefaultMsg = () => {
        if (!next) return '우주 최강의 단어 마스터! 👑';
        if (needDays > 0 && needWords > 0) return `${needDays}일 더 오고, 단어 ${needWords}개 외우자!`;
        if (needDays > 0) return `단어는 완벽해! 출석 ${needDays}일 렛츠고! 🏃`;
        if (needWords > 0) return `단어 ${needWords}개만 더 마스터하면 진화! ✨`;
        return `조건 달성! 곧 진화해요! 🎉`;
    };

    const displayMsg = msgIndex !== -1 ? BUBBLE_MESSAGES[msgIndex] : getDefaultMsg();

    if (!isMounted) return <div className="animate-pulse bg-slate-100 rounded-3xl h-48 w-full" />;

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} rounded-3xl border-[3px] ${theme.ring} p-4 sm:p-5 transition-colors duration-700`}>
            <div className="absolute inset-0 bg-white/10 z-0 pointer-events-none" />

            {/* 상단: 캐릭터 + 정보 */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">

                {/* SVG 캐릭터 영역 */}
                <div
                    className="relative shrink-0 cursor-pointer group"
                    onClick={handleInteract}
                    title="저를 터치해주세요 찌찍!"
                >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative">
                        <HamsterSVG level={stage.level} bounce={bounce} blink={blink} />
                    </div>

                    {/* 터치 유도 */}
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Sparkles className="w-5 h-5 text-yellow-400 rotate-12" strokeWidth={3} />
                    </div>

                    {/* 레벨 뱃지 */}
                    <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 bg-white rounded-full text-[11px] sm:text-xs font-black text-slate-800 shadow-md border-[2px] ${theme.ring.split(' ')[0]} flex items-center gap-0.5 z-20`}>
                        <Star className={`w-3 h-3 ${theme.icon} fill-current`} />
                        Lv.{stage.level}
                    </div>
                </div>

                {/* 이름 + 말풍선 */}
                <div className="flex-1 min-w-0">
                    <div className="mb-1">
                        <span className="inline-block px-2 py-0.5 bg-white/70 rounded-md text-[10px] sm:text-xs font-bold text-slate-500 mb-1 shadow-sm border border-slate-100/50">
                            {stage.title}
                        </span>
                        <h2 className={`font-black tracking-tight text-lg sm:text-xl pb-1 ${theme.title} truncate`}>
                            {stage.name}
                        </h2>
                    </div>
                    <div className="relative mt-2">
                        <div className="absolute -left-1.5 top-2 w-3 h-3 bg-white/90 rotate-45 border-l border-b border-slate-200 z-0" />
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-sm p-3 shadow-sm border border-slate-200 z-10">
                            <p className="text-xs sm:text-sm font-bold text-slate-600 leading-snug break-keep">
                                &ldquo;{displayMsg}&rdquo;
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 하단: 진행도 바 */}
            {next && (
                <div className="relative z-10 mt-5 space-y-3 bg-white/40 p-3 sm:p-4 rounded-2xl border border-white/50 shadow-inner">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <CalendarHeart className="w-4 h-4 text-rose-500" />
                                <span className="text-xs font-bold text-slate-700">연속 출석</span>
                            </div>
                            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500">
                                <span className={daysPct >= 100 ? 'text-rose-600' : 'text-slate-800'}>{currentStreak}</span> / {next.minDays}일
                            </span>
                        </div>
                        <div className="w-full h-3 sm:h-3.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${daysPct}%` }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-bold text-slate-700">마스터 단어</span>
                            </div>
                            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500">
                                <span className={wordsPct >= 100 ? 'text-orange-600' : 'text-slate-800'}>{totalMasteredCount}</span> / {next.minWords}단어
                            </span>
                        </div>
                        <div className="w-full h-3 sm:h-3.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full bg-gradient-to-r ${theme.bar} rounded-full transition-all duration-1000 ease-out relative`} style={{ width: `${wordsPct}%` }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite_0.5s]" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!next && (
                <div className="relative z-10 mt-5 bg-gradient-to-r from-amber-100/50 to-orange-100/50 p-4 rounded-2xl border border-amber-200 text-center">
                    <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-black text-amber-700 text-sm">모든 진화 단계를 마스터했습니다!</p>
                    <p className="font-bold text-amber-600/80 text-xs mt-0.5">앞으로도 꾸준히 공부해주세요!</p>
                </div>
            )}
        </div>
    );
}
