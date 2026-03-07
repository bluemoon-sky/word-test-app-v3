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

    return (
        <svg
            viewBox="0 0 120 120"
            className={`w-full h-full transition-transform duration-300 ${bounce ? 'scale-110' : ''}`}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >


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

            {/* ============================================================ */}
            {/* 레벨별 누적 아이템 (레벨이 올라갈수록 하나씩 추가됨!)         */}
            {/* ============================================================ */}

            {/* ── 브론즈 티어 (Lv 2~5) ── */}
            {/* Lv2: 머리 위 나뭇잎 🍃 */}
            {level >= 2 && (
                <g>
                    <ellipse cx="72" cy="24" rx="6" ry="3.5" fill="#66CC66" transform="rotate(-30,72,24)" />
                    <line x1="72" y1="24" x2="75" y2="20" stroke="#448844" strokeWidth="1" />
                </g>
            )}
            {/* Lv3: 목에 리본 🎀 */}
            {level >= 3 && (
                <g>
                    <polygon points="54,76 60,80 66,76 60,72" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.8" />
                    <circle cx="60" cy="76" r="2" fill="#FF1493" />
                </g>
            )}
            {/* Lv4: 오른손에 해바라기씨 🌻 */}
            {level >= 4 && (
                <g>
                    <ellipse cx="88" cy="75" rx="5" ry="3" fill="#8B6914" transform="rotate(20,88,75)" />
                    <ellipse cx="88" cy="75" rx="3" ry="1.5" fill="#A0824A" transform="rotate(20,88,75)" />
                </g>
            )}
            {/* Lv5: 볼 빵빵 (볼 크기 확대) */}
            {level >= 5 && (
                <g>
                    <circle cx="38" cy="62" r="4" fill={theme.cheek} opacity="0.8" />
                    <circle cx="82" cy="62" r="4" fill={theme.cheek} opacity="0.8" />
                </g>
            )}

            {/* ── 실버 티어 (Lv 6~10) ── */}
            {/* Lv6: 머리띠 */}
            {level >= 6 && (
                <rect x="36" y="30" width="48" height="4" rx="2" fill="#FF6B6B" opacity="0.9" />
            )}
            {/* Lv7: 안경 🤓 */}
            {level >= 7 && (
                <g>
                    <circle cx="50" cy="50" r="7" fill="none" stroke="#555" strokeWidth="1.5" />
                    <circle cx="70" cy="50" r="7" fill="none" stroke="#555" strokeWidth="1.5" />
                    <line x1="57" y1="50" x2="63" y2="50" stroke="#555" strokeWidth="1.5" />
                    <line x1="43" y1="49" x2="36" y2="46" stroke="#555" strokeWidth="1" />
                    <line x1="77" y1="49" x2="84" y2="46" stroke="#555" strokeWidth="1" />
                </g>
            )}
            {/* Lv8: 왼손에 돋보기 🔍 */}
            {level >= 8 && (
                <g>
                    <circle cx="28" cy="78" r="6" fill="none" stroke="#888" strokeWidth="1.5" />
                    <circle cx="28" cy="78" r="6" fill="#CCDDFF" opacity="0.3" />
                    <line x1="33" y1="83" x2="38" y2="90" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                </g>
            )}
            {/* Lv9: 등에 배낭 🎒 */}
            {level >= 9 && (
                <g>
                    <rect x="80" y="58" width="12" height="16" rx="3" fill="#CC6633" stroke="#AA5522" strokeWidth="1" />
                    <rect x="82" y="62" width="8" height="4" rx="1" fill="#DDAA77" />
                    <circle cx="86" cy="68" r="1.5" fill="#AA5522" />
                </g>
            )}
            {/* Lv10: 오른손에 책 📖 */}
            {level >= 10 && (
                <g>
                    <rect x="86" y="73" width="10" height="8" rx="1" fill="#4488CC" stroke="#336699" strokeWidth="0.8" />
                    <line x1="91" y1="73" x2="91" y2="81" stroke="#336699" strokeWidth="0.8" />
                    <rect x="88" y="74" width="3" height="1" rx="0.5" fill="white" opacity="0.6" />
                    <rect x="92" y="75" width="3" height="1" rx="0.5" fill="white" opacity="0.6" />
                </g>
            )}

            {/* ── 골드 티어 (Lv 11~15) ── */}
            {/* Lv11: 마법사 모자 🎩 */}
            {level >= 11 && (
                <g>
                    <polygon points="60,2 44,32 76,32" fill="#3B3B98" stroke="#FFD700" strokeWidth="1.5" />
                    <rect x="44" y="29" width="32" height="4" rx="2" fill="#FFD700" />
                </g>
            )}
            {/* Lv12: 모자 꼭대기 별 ⭐ */}
            {level >= 12 && (
                <text x="55" y="10" fontSize="10">⭐</text>
            )}
            {/* Lv13: 마법 지팡이 🪄 */}
            {level >= 13 && (
                <g>
                    <line x1="92" y1="60" x2="100" y2="40" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="100" cy="38" r="3.5" fill="#FFD700" opacity="0.8">
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                </g>
            )}
            {/* Lv14: 망토 */}
            {level >= 14 && (
                <g>
                    <path d="M35 65 Q30 85 38 100 L60 95 L82 100 Q90 85 85 65" fill="#6A0DAD" opacity="0.4" />
                    <path d="M35 65 Q30 85 38 100 L60 95 L82 100 Q90 85 85 65" fill="none" stroke="#8B00FF" strokeWidth="0.8" opacity="0.6" />
                </g>
            )}
            {/* Lv15: 반짝이 파티클 */}
            {level >= 15 && (
                <>
                    <text x="18" y="28" fontSize="10" opacity="0.7">✨</text>
                    <text x="92" y="25" fontSize="8" opacity="0.5">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                        ✨
                    </text>
                </>
            )}

            {/* ── 무지개 티어 (Lv 16~20) ── */}
            {/* Lv16: 왕관으로 교체 (모자 위에) 👑 */}
            {level >= 16 && (
                <g>
                    <polygon points="42,30 45,18 50,26 55,12 60,26 65,12 70,26 75,18 78,30" fill="#FFD700" stroke="#FFA500" strokeWidth="1" />
                </g>
            )}
            {/* Lv17: 왕관 보석 💎 */}
            {level >= 17 && (
                <g>
                    <circle cx="55" cy="22" r="2" fill="#FF4444" />
                    <circle cx="60" cy="18" r="2.5" fill="#4444FF" />
                    <circle cx="65" cy="22" r="2" fill="#44CC44" />
                </g>
            )}
            {/* Lv18: 후광 오라 */}
            {level >= 18 && (
                <>
                    <circle cx="60" cy="65" r="50" fill="url(#auraGrad18)" opacity="0.2">
                        <animate attributeName="r" values="48;53;48" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <defs>
                        <radialGradient id="auraGrad18">
                            <stop offset="0%" stopColor={theme.body} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>
                </>
            )}
            {/* Lv19: 궤도 도는 별들 ⭐ */}
            {level >= 19 && (
                <g>
                    <text x="15" y="50" fontSize="7">⭐</text>
                    <text x="100" y="60" fontSize="7">
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                        ⭐
                    </text>
                    <text x="55" y="110" fontSize="6">🌟</text>
                </g>
            )}
            {/* Lv20: 무지개 아치 + 신성한 빛 🌈 */}
            {level >= 20 && (
                <g>
                    <path d="M20 50 Q60 -10 100 50" fill="none" stroke="url(#rainbowGrad)" strokeWidth="3" opacity="0.5" />
                    <defs>
                        <linearGradient id="rainbowGrad">
                            <stop offset="0%" stopColor="#FF0000" />
                            <stop offset="20%" stopColor="#FF8800" />
                            <stop offset="40%" stopColor="#FFFF00" />
                            <stop offset="60%" stopColor="#00FF00" />
                            <stop offset="80%" stopColor="#0088FF" />
                            <stop offset="100%" stopColor="#8800FF" />
                        </linearGradient>
                    </defs>
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
