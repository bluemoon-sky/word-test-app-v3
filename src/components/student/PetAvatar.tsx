'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, CalendarHeart, Flame, Star, Trophy } from 'lucide-react';

// ============================================================================
// 1. 20단계 햄스터 진화 로직
// ============================================================================
const HAMSTER_STAGES = [
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
    // 햄스터 본체: 따뜻한 크림/베이지 톤, 배경 테마만 티어별 변경
    const hamster = { body: '#FFF5E6', belly: '#FFFFFF', cheek: '#FFB0B0', ear: '#F5D6B8', earInner: '#FFCACA', outline: '#D4A574' };
    if (level <= 5) return { ...hamster, bg: 'from-amber-50 via-orange-50/50 to-yellow-50/30', ring: 'border-orange-200', bar: 'from-orange-400 to-amber-500', title: 'text-orange-600', icon: 'text-orange-500' };
    if (level <= 10) return { ...hamster, bg: 'from-slate-50 via-blue-50/50 to-indigo-50/30', ring: 'border-blue-200', bar: 'from-blue-400 to-indigo-500', title: 'text-blue-600', icon: 'text-blue-500' };
    if (level <= 15) return { ...hamster, bg: 'from-yellow-50 via-amber-100/30 to-rose-50/30', ring: 'border-amber-300 shadow-lg', bar: 'from-amber-400 via-yellow-400 to-orange-500', title: 'text-amber-600', icon: 'text-amber-500' };
    return { ...hamster, bg: 'from-violet-50 via-fuchsia-50/50 to-cyan-50/50', ring: 'border-fuchsia-300 shadow-xl', bar: 'from-violet-500 via-fuchsia-500 to-cyan-500', title: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600', icon: 'text-fuchsia-500' };
};

// ============================================================================
// 4. SVG 햄스터 캐릭터 컴포넌트 (순수 코드로 렌더링)
// ============================================================================
function HamsterSVG({ level, bounce, blink }: { level: number; bounce: boolean; blink: boolean }) {
    const theme = getTheme(level);

    return (
        <svg
            viewBox="0 0 500 500"
            className={`w-full h-full transition-transform duration-300 ${bounce ? 'scale-110' : ''}`}
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}
        >
            {/* ── defs: 그림자, 그라디언트 ── */}
            <defs>
                <filter id="hamsterShadow" x="-10%" y="-5%" width="120%" height="130%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#D4A574" floodOpacity="0.25" />
                </filter>
                <radialGradient id="bodyGrad" cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#FFFAF3" />
                    <stop offset="100%" stopColor={theme.body} />
                </radialGradient>
                <radialGradient id="headGrad" cx="50%" cy="35%" r="55%">
                    <stop offset="0%" stopColor="#FFFCF5" />
                    <stop offset="100%" stopColor={theme.body} />
                </radialGradient>
                <radialGradient id="cheekGradL" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFBABA" />
                    <stop offset="100%" stopColor="#FFD4D4" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cheekGradR" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFBABA" />
                    <stop offset="100%" stopColor="#FFD4D4" stopOpacity="0" />
                </radialGradient>
                {level >= 18 && (
                    <radialGradient id="auraGrad18">
                        <stop offset="0%" stopColor={theme.body} />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                )}
            </defs>

            {/* 전체 숨쉬기 애니메이션 */}
            <g>
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-6; 0,0" dur="2.2s" repeatCount="indefinite" />

                {/* ── id="shadow": 바닥 그림자 ── */}
                <g id="shadow">
                    <ellipse cx="250" cy="460" rx="130" ry="18" fill="#D4A574" opacity="0.15">
                        <animate attributeName="rx" values="130;120;130" dur="2.2s" repeatCount="indefinite" />
                    </ellipse>
                </g>

                {/* ── [Seamless Mochi Technique] 외곽선 실루엣 ── */}
                {/* 귀, 몸통, 볼, 꼬리를 모두 합쳐 두꺼운 외곽선으로 그립니다 */}
                <g id="body_outline" fill={theme.outline} stroke={theme.outline} strokeWidth="14" strokeLinejoin="round" filter="url(#hamsterShadow)">
                    <circle cx="150" cy="150" r="35" />
                    <circle cx="350" cy="150" r="35" />
                    <circle cx="380" cy="380" r="35" />
                    <ellipse cx="250" cy="220" rx="140" ry="120" />
                    <ellipse cx="120" cy="320" rx="65" ry="75" transform="rotate(-20 120 320)" />
                    <ellipse cx="380" cy="320" rx="65" ry="75" transform="rotate(20 380 320)" />
                    <ellipse cx="250" cy="360" rx="180" ry="75" />
                    <circle cx="250" cy="300" r="130" />
                </g>

                {/* ── 중앙 본체 채우기 (앞선 외곽선 내부를 덮어 하나로 연결된 찹쌀떡을 완성) ── */}
                <g id="body_fill" fill={theme.body}>
                    <circle cx="150" cy="150" r="35" />
                    <circle cx="350" cy="150" r="35" />
                    <circle cx="380" cy="380" r="35" />
                    <ellipse cx="250" cy="220" rx="140" ry="120" />
                    <ellipse cx="120" cy="320" rx="65" ry="75" transform="rotate(-20 120 320)" />
                    <ellipse cx="380" cy="320" rx="65" ry="75" transform="rotate(20 380 320)" />
                    <ellipse cx="250" cy="360" rx="180" ry="75" />
                    <circle cx="250" cy="300" r="130" />
                </g>

                {/* ── 하얀 배 ── */}
                <g id="belly" fill={theme.belly}>
                    <ellipse cx="250" cy="360" rx="120" ry="65" />
                    <circle cx="250" cy="315" r="85" />
                </g>

                {/* ── 얼굴: 초초 카와이 (이목구비를 중앙 아래로 옹기종기 모음) ── */}
                <g id="face">
                    {/* 귀 안쪽 핑크! Outline 필요없으므로 따로 */}
                    <circle cx="150" cy="155" r="16" fill={theme.earInner} />
                    <circle cx="350" cy="155" r="16" fill={theme.earInner} />

                    {/* 부드러운 볼터치 그라디언트 효과 대체 (은은한 핑크) */}
                    <ellipse cx="135" cy="285" rx="35" ry="22" fill={theme.cheek} opacity="0.6" style={{ filter: 'blur(3px)' }} />
                    <ellipse cx="365" cy="285" rx="35" ry="22" fill={theme.cheek} opacity="0.6" style={{ filter: 'blur(3px)' }} />

                    {/* 눈 (큼지막하고 반짝거리는 유리구슬 눈동자) */}
                    {blink ? (
                        <g stroke="#3D2C22" strokeWidth="7" strokeLinecap="round" fill="none">
                            <path d="M 175 270 Q 190 255 205 270" />
                            <path d="M 295 270 Q 310 255 325 270" />
                        </g>
                    ) : (
                        <g>
                            <circle cx="190" cy="265" r="23" fill="#3D2C22" />
                            <circle cx="310" cy="265" r="23" fill="#3D2C22" />
                            {/* 크고 영롱한 별빛 하이라이트들 */}
                            <circle cx="182" cy="256" r="9" fill="#FFFFFF" />
                            <circle cx="302" cy="256" r="9" fill="#FFFFFF" />
                            <circle cx="196" cy="274" r="4" fill="#FFFFFF" opacity="0.9" />
                            <circle cx="316" cy="274" r="4" fill="#FFFFFF" opacity="0.9" />
                            <circle cx="184" cy="270" r="2.5" fill="#FFFFFF" opacity="0.6" />
                            <circle cx="304" cy="270" r="2.5" fill="#FFFFFF" opacity="0.6" />
                        </g>
                    )}

                    {/* 앙증맞은 삼각 코 */}
                    <path d="M 246 290 Q 250 296 254 290 L 250 294 Z" fill="#E8876B" stroke="#E8876B" strokeWidth="2.5" strokeLinejoin="round" />

                    {/* ㅅ(ω) 모양의 행복한 입매 */}
                    <path d="M 235 294 Q 242.5 306 250 294 Q 257.5 306 265 294" fill="none" stroke="#CC7A7A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* 여린 수염 (opacity 로 은은하게) */}
                    <line x1="85" y1="260" x2="130" y2="265" stroke="#E0C8B0" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
                    <line x1="80" y1="280" x2="130" y2="275" stroke="#E0C8B0" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
                    <line x1="370" y1="265" x2="415" y2="260" stroke="#E0C8B0" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
                    <line x1="370" y1="275" x2="420" y2="280" stroke="#E0C8B0" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
                </g>

                {/* ── id="paws": 발 (가슴에 다소곳이) ── */}
                <g id="paws">
                    {/* 뒷발: 몸통 밑으로 살짝 튀어나온 동글동글 발 */}
                    <g fill={theme.body} stroke={theme.outline} strokeWidth="6" strokeLinejoin="round">
                        <ellipse cx="160" cy="435" rx="30" ry="20" />
                        <ellipse cx="340" cy="435" rx="30" ry="20" />
                    </g>
                    <ellipse cx="160" cy="437" rx="12" ry="7" fill={theme.earInner} opacity="0.8" />
                    <ellipse cx="340" cy="437" rx="12" ry="7" fill={theme.earInner} opacity="0.8" />

                    {/* 앞발: 가슴에서 오물거림 */}
                    <g>
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-5; 0,0" dur="2.2s" repeatCount="indefinite" />
                        <g fill={theme.body} stroke={theme.outline} strokeWidth="5" strokeLinecap="round">
                            <ellipse cx="220" cy="340" rx="16" ry="22" transform="rotate(20 220 340)" />
                            <ellipse cx="280" cy="340" rx="16" ry="22" transform="rotate(-20 280 340)" />
                        </g>
                    </g>
                </g>

                {/* ── id="accessories": 레벨별 누적 아이템 ── */}
                <g id="accessories">
                    {/* Lv2: 새싹 */}
                    {level >= 2 && (<g><ellipse cx="290" cy="110" rx="28" ry="15" fill="#4ade80" transform="rotate(-30,290,110)" stroke="#22c55e" strokeWidth="3" /><line x1="290" y1="110" x2="300" y2="95" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" /><line x1="282" y1="115" x2="290" y2="105" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" /></g>)}
                    {/* Lv3: 핑크 리본 */}
                    {level >= 3 && (<g><path d="M200 330 C200 310, 230 318, 250 330 C270 318, 300 310, 300 330 C300 345, 280 340, 250 330 C220 340, 200 345, 200 330 Z" fill="#f472b6" stroke="#db2777" strokeWidth="4" strokeLinejoin="round" /><circle cx="250" cy="330" r="10" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" /></g>)}
                    {/* Lv4: 해바라기씨 */}
                    {level >= 4 && (<g><ellipse cx="330" cy="330" rx="22" ry="14" fill="#fbbf24" stroke="#b45309" strokeWidth="3" transform="rotate(20,330,330)" /><ellipse cx="330" cy="330" rx="14" ry="7" fill="#fcd34d" transform="rotate(20,330,330)" /></g>)}
                    {/* Lv5: 먹보 볼살 */}
                    {level >= 5 && (<g><circle cx="130" cy="290" r="18" fill={theme.cheek} opacity="0.85" /><circle cx="370" cy="290" r="18" fill={theme.cheek} opacity="0.85" /><circle cx="122" cy="284" r="5" fill="white" opacity="0.5" /><circle cx="362" cy="284" r="5" fill="white" opacity="0.5" /></g>)}
                    {/* Lv6: 운동 머리띠 */}
                    {level >= 6 && (<g><path d="M120 180 Q250 200 380 180 L380 195 Q250 215 120 195 Z" fill="#ef4444" opacity="0.95" /><path d="M130 188 Q250 208 370 188 L370 192 Q250 212 130 192 Z" fill="#fca5a5" opacity="0.8" /></g>)}
                    {/* Lv7: 똘똘이 안경 */}
                    {level >= 7 && (<g><circle cx="190" cy="265" r="32" fill="none" stroke="#1f2937" strokeWidth="8" /><circle cx="310" cy="265" r="32" fill="none" stroke="#1f2937" strokeWidth="8" /><line x1="222" y1="265" x2="278" y2="265" stroke="#1f2937" strokeWidth="8" /><line x1="158" y1="255" x2="125" y2="240" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" /><line x1="342" y1="255" x2="375" y2="240" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" /></g>)}
                    {/* Lv8: 탐정 돋보기 */}
                    {level >= 8 && (<g><circle cx="108" cy="330" r="24" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="5" /><line x1="128" y1="350" x2="150" y2="380" stroke="#475569" strokeWidth="8" strokeLinecap="round" /></g>)}
                    {/* Lv9: 탐험가 배낭 */}
                    {level >= 9 && (<g><rect x="360" y="300" width="52" height="60" rx="12" fill="#d97706" stroke="#92400e" strokeWidth="4" /><rect x="366" y="315" width="40" height="18" rx="6" fill="#f59e0b" /><circle cx="386" cy="345" r="6" fill="#fbbf24" /></g>)}
                    {/* Lv10: 열공 서적 */}
                    {level >= 10 && (<g><rect x="360" y="320" width="48" height="34" rx="4" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="3" transform="rotate(-10,384,337)" /><line x1="384" y1="320" x2="384" y2="354" stroke="#1e3a8a" strokeWidth="3" transform="rotate(-10,384,337)" /></g>)}
                    {/* Lv11: 마법사 모자 */}
                    {level >= 11 && (<g><polygon points="250,5 170,125 330,125" fill="#4f46e5" stroke="#fef08a" strokeWidth="5" strokeLinejoin="round" /><rect x="156" y="115" width="188" height="18" rx="9" fill="#facc15" stroke="#ca8a04" strokeWidth="3" /></g>)}
                    {/* Lv12: 플로팅 별 */}
                    {level >= 12 && (<text x="220" y="25" fontSize="50" style={{ transformOrigin: '250px 10px' }}><animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="2s" repeatCount="indefinite" />&#11088;</text>)}
                    {/* Lv13: 요술 지팡이 */}
                    {level >= 13 && (<g><line x1="395" y1="280" x2="440" y2="160" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" /><circle cx="440" cy="160" r="16" fill="#fef08a" stroke="#ca8a04" strokeWidth="3" /><circle cx="440" cy="160" r="22" fill="#fef08a" opacity="0.4"><animate attributeName="r" values="18;28;18" dur="1s" repeatCount="indefinite" /></circle></g>)}
                    {/* Lv14: 마법사의 망토 */}
                    {level >= 14 && (<g><path d="M100 290 Q40 380 80 440 L250 420 L420 440 Q460 380 400 290" fill="#6d28d9" opacity="0.75" /><path d="M100 290 Q40 380 80 440 L250 420 L420 440 Q460 380 400 290" fill="none" stroke="#fde047" strokeWidth="5" opacity="0.85" /></g>)}
                    {/* Lv15: 공중 반짝이 요소 */}
                    {level >= 15 && (<><text x="60" y="110" fontSize="32" opacity="0.7">&#10024;</text><text x="400" y="105" fontSize="28" opacity="0.5"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />&#10024;</text></>)}
                    {/* Lv16: 금관 */}
                    {level >= 16 && (<g><polygon points="158,125 175,45 210,95 250,20 290,95 325,45 342,125" fill="#facc15" stroke="#b45309" strokeWidth="4" strokeLinejoin="round" /><rect x="150" y="115" width="200" height="18" rx="6" fill="#eab308" /></g>)}
                    {/* Lv17: 보석 */}
                    {level >= 17 && (<g><circle cx="210" cy="75" r="12" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" /><circle cx="250" cy="50" r="15" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" /><circle cx="290" cy="75" r="12" fill="#22c55e" stroke="#14532d" strokeWidth="2" /><circle cx="248" cy="45" r="5" fill="white" opacity="0.8" /></g>)}
                    {/* Lv18: 은하계 아우라 */}
                    {level >= 18 && (<circle cx="250" cy="280" r="210" fill="url(#auraGrad18)" opacity="0.18"><animate attributeName="r" values="200;220;200" dur="2s" repeatCount="indefinite" /></circle>)}
                    {/* Lv19: 무중력 별들 */}
                    {level >= 19 && (<g><text x="40" y="210" fontSize="36" opacity="0.9">&#11088;<animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" /></text><text x="415" y="230" fontSize="42" opacity="0.9">&#127775;<animate attributeName="y" values="230;200;230" dur="2s" repeatCount="indefinite" /></text></g>)}
                    {/* Lv20: 신화의 둥근 빛기둥(무지개 아치) */}
                    {level >= 20 && (<g><path d="M40 430 A210 210 0 0 1 460 430" fill="none" stroke="#ef4444" strokeWidth="10" opacity="0.8" /><path d="M55 430 A195 195 0 0 1 445 430" fill="none" stroke="#f59e0b" strokeWidth="10" opacity="0.8" /><path d="M70 430 A180 180 0 0 1 430 430" fill="none" stroke="#eab308" strokeWidth="10" opacity="0.8" /><path d="M85 430 A165 165 0 0 1 415 430" fill="none" stroke="#22c55e" strokeWidth="10" opacity="0.8" /><path d="M100 430 A150 150 0 0 1 400 430" fill="none" stroke="#3b82f6" strokeWidth="10" opacity="0.8" /><path d="M115 430 A135 135 0 0 1 385 430" fill="none" stroke="#8b5cf6" strokeWidth="10" opacity="0.8" /></g>)}
                </g>
            </g>
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
                    className="relative shrink-0 cursor-pointer group flex flex-col items-center"
                    onClick={handleInteract}
                    title="저를 터치해주세요 찌찍!"
                >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center relative">
                        <HamsterSVG level={stage.level} bounce={bounce} blink={blink} />
                    </div>

                    {/* 터치 유도 */}
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Sparkles className="w-5 h-5 text-yellow-400 rotate-12" strokeWidth={3} />
                    </div>

                    {/* 레벨 뱃지 (캐릭터 중앙 아래) */}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white rounded-full text-[11px] sm:text-xs font-black text-slate-800 shadow-md border-[2px] ${theme.ring.split(' ')[0]} flex items-center gap-1 z-20 whitespace-nowrap`}>
                        <Star className={`w-3.5 h-3.5 ${theme.icon} fill-current`} />
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
