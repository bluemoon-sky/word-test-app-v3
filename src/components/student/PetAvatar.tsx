'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, CalendarHeart, Flame, Star, Trophy } from 'lucide-react';

// ----------------------------------------------------------------------------
// 1. 20단계 햄스터 진화 로직 (짧은 보상 주기 적용)
// 조건: minDays(연속 출석) & minWords(마스터 단어 수) 모두 충족
// 초반 1~5구간은 허들을 매우 낮추고, 뒤로 갈수록 간격 확장
// 베이스 이미지와 파츠 이미지를 레이어링: base: 1~5, item: 레벨별 고유 파일
// ----------------------------------------------------------------------------
export const HAMSTER_STAGES = [
    // 🐣 티어 1: 브론즈 구간 (Lv 1 ~ 5) - 초급 (img: 기존 lv1~lv10.png 매핑)
    { level: 1, minDays: 0, minWords: 0, title: '갓 태어난', name: '점박이 햄스터', img: 1 },
    { level: 2, minDays: 1, minWords: 5, title: '눈을 뜬', name: '호기심 햄스터', img: 1 },
    { level: 3, minDays: 2, minWords: 15, title: '뒤뚱뒤뚱', name: '아기 햄스터', img: 2 },
    { level: 4, minDays: 3, minWords: 30, title: '해바라기씨', name: '발견자 햄스터', img: 2 },
    { level: 5, minDays: 4, minWords: 50, title: '볼따구 빵빵', name: '먹보 햄스터', img: 3 },

    // 🥈 티어 2: 실버 구간 (Lv 6 ~ 10) - 중급
    { level: 6, minDays: 6, minWords: 80, title: '체력 증진', name: '런닝 햄스터', img: 3 },
    { level: 7, minDays: 8, minWords: 120, title: '잔머리 굴리는', name: '천재 햄스터', img: 4 },
    { level: 8, minDays: 11, minWords: 170, title: '호기심 천국', name: '탐정 햄스터', img: 5 },
    { level: 9, minDays: 14, minWords: 230, title: '야외 체질', name: '탐험가 햄스터', img: 5 },
    { level: 10, minDays: 17, minWords: 300, title: '열공 모드', name: '선비 햄스터', img: 6 },

    // 🥇 티어 3: 골드 구간 (Lv 11 ~ 15) - 고급
    { level: 11, minDays: 21, minWords: 380, title: '해리포터 지망생', name: '마법 신입생 햄스터', img: 6 },
    { level: 12, minDays: 25, minWords: 470, title: '지식의 수호자', name: '사서 햄스터', img: 7 },
    { level: 13, minDays: 30, minWords: 570, title: '우주로 향하는', name: '로켓 햄스터', img: 7 },
    { level: 14, minDays: 35, minWords: 680, title: '번개를 부르는', name: '마법사 햄스터', img: 8 },
    { level: 15, minDays: 40, minWords: 800, title: '전설의 입문', name: '기사 햄스터', img: 8 },

    // 🌈 티어 4: 무지개 구간 (Lv 16 ~ 20) - 마스터
    { level: 16, minDays: 46, minWords: 950, title: '시간을 거스르는', name: '현자 햄스터', img: 9 },
    { level: 17, minDays: 52, minWords: 1100, title: '모든 것을 아는', name: '대현자 햄스터', img: 9 },
    { level: 18, minDays: 59, minWords: 1250, title: '빛나는 왕관', name: '왕실 햄스터', img: 10 },
    { level: 19, minDays: 67, minWords: 1400, title: '우주를 정복한', name: '은하계 햄스터', img: 10 },
    { level: 20, minDays: 75, minWords: 1600, title: '신화가 된', name: '단어의 신 햄스터', img: 10 },
];

function getStage(streak: number, words: number) {
    let current = HAMSTER_STAGES[0];
    for (const stage of HAMSTER_STAGES) {
        if (streak >= stage.minDays && words >= stage.minWords) current = stage;
    }
    return current;
}

function getNextStage(streak: number, words: number) {
    const st = getStage(streak, words);
    const idx = HAMSTER_STAGES.indexOf(st);
    if (idx < HAMSTER_STAGES.length - 1) return HAMSTER_STAGES[idx + 1];
    return null;
}

// ----------------------------------------------------------------------------
// 2. 랜덤 터치/클릭 시 노출될 말풍선 메시지
// ----------------------------------------------------------------------------
const BUBBLE_MESSAGES = [
    "앗, 간지러워 찌찍! >_<",
    "오늘도 단어 공부 파이팅!",
    "해바라기씨 먹고 싶다 뇸뇸뇸",
    "우리 다음 레벨로 가볼까요?!",
    "주인님, 쓰다듬어줘서 고마워요 🐹",
    "찍찍! 천재가 된 기분이에요!",
    "조금만 더 하면 진화할 수 있어요 🔥",
    "단어 마스터 게이지가 쑥쑥 오르네요!",
];

// ----------------------------------------------------------------------------
// 3. UI 테마 설정 (레벨 티어에 따른 화려한 그라데이션)
// ----------------------------------------------------------------------------
const getTheme = (level: number) => {
    if (level <= 5) return { // 브론즈
        bg: 'from-amber-50 via-orange-50/50 to-yellow-50/30',
        ring: 'border-orange-200 shadow-orange-100/50',
        bar: 'from-orange-400 to-amber-500',
        title: 'text-orange-600',
        icon: 'text-orange-500'
    };
    if (level <= 10) return { // 실버
        bg: 'from-slate-50 via-blue-50/50 to-indigo-50/30',
        ring: 'border-blue-200 shadow-blue-100/50',
        bar: 'from-blue-400 to-indigo-500',
        title: 'text-blue-600',
        icon: 'text-blue-500'
    };
    if (level <= 15) return { // 골드
        bg: 'from-yellow-50 via-amber-100/30 to-rose-50/30',
        ring: 'border-amber-300 shadow-amber-200/50 shadow-lg',
        bar: 'from-amber-400 via-yellow-400 to-orange-500',
        title: 'text-amber-600',
        icon: 'text-amber-500'
    };
    return { // 무지개 (마스터)
        bg: 'from-violet-50 via-fuchsia-50/50 to-cyan-50/50 bg-[length:200%_200%] animate-[gradient_3s_ease_infinite]',
        ring: 'border-fuchsia-300 shadow-fuchsia-200/60 shadow-xl',
        bar: 'from-violet-500 via-fuchsia-500 to-cyan-500',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600',
        icon: 'text-fuchsia-500'
    };
};

type Props = {
    currentStreak: number;
    totalMasteredCount: number;
};

export default function PetAvatar({ currentStreak, totalMasteredCount }: Props) {
    const stage = getStage(currentStreak, totalMasteredCount);
    const next = getNextStage(currentStreak, totalMasteredCount);
    const theme = getTheme(stage.level);

    // 인터랙션 상태
    const [bounce, setBounce] = useState(false);
    const [msgIndex, setMsgIndex] = useState(-1);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    // 남은 조건 계산
    const needDays = next ? Math.max(0, next.minDays - currentStreak) : 0;
    const needWords = next ? Math.max(0, next.minWords - totalMasteredCount) : 0;

    // 진행률 % 계산
    const runDaysCalc = next ? (currentStreak / next.minDays) * 100 : 100;
    const runWordsCalc = next ? (totalMasteredCount / next.minWords) * 100 : 100;
    const daysPct = Math.min(Math.max(runDaysCalc, 0), 100);
    const wordsPct = Math.min(Math.max(runWordsCalc, 0), 100);

    // 클릭 인터랙션 이벤트
    const handleInteract = () => {
        if (bounce) return;
        setBounce(true);
        // 랜덤 대사 선택 (이전 대사와 겹치지 않게)
        let newIdx;
        do { newIdx = Math.floor(Math.random() * BUBBLE_MESSAGES.length); } while (newIdx === msgIndex);
        setMsgIndex(newIdx);

        setTimeout(() => setBounce(false), 500); // 점프 애니메이션 지속시간
    };

    // 기본 말풍선 (터치 안했을 때 보여줄 상태 의존형 메시지)
    const getDefaultMsg = () => {
        if (!next) return '우주 최강의 단어 마스터! 영광입니다 👑';
        if (needDays > 0 && needWords > 0) return `${needDays}일 더 오고, 단어 ${needWords}개 외우자!`;
        if (needDays > 0) return `단어는 완벽해! 출석 ${needDays}일 렛츠고! 🏃`;
        if (needWords > 0) return `단어 ${needWords}개만 더 마스터하면 진화해! ✨`;
        return `조건 달성! 곧 다음 모습으로 변할 거야! 🎉`;
    };

    const displayMsg = msgIndex !== -1 ? BUBBLE_MESSAGES[msgIndex] : getDefaultMsg();

    if (!isMounted) return <div className="animate-pulse bg-slate-100 rounded-3xl h-48 w-full" />;

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} rounded-3xl border-[3px] ${theme.ring} p-4 sm:p-5 transition-colors duration-700`}>

            {/* 빛나는 오버레이 (화려함 1방울) */}
            <div className="absolute inset-0 bg-white/20 z-0 pointer-events-none" />

            {/* ------ 상단: 햄스터 캐릭터 + 정보 ------ */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-6">

                {/* 왼쪽: 햄스터 렌더링 영역 (인터랙션 가능) */}
                <div
                    className="relative shrink-0 cursor-pointer group"
                    onClick={handleInteract}
                    title="저를 터치해주세요 찌찍!"
                >
                    {/* 배경 후광 */}
                    <div className="absolute inset-0 bg-white/50 rounded-full blur-xl scale-110 group-hover:bg-white/70 transition-colors" />

                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center shadow-inner overflow-visible relative border border-white/60">
                        {/* 둥둥 떠다니기 + 클릭 시 점프 */}
                        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 transition-transform ${bounce ? 'animate-[bounce_0.5s_ease-out]' : 'animate-[float_3s_ease-in-out_infinite]'}`}>
                            <Image
                                src={`/images/pets/hamster/lv${stage.img}.png`}
                                alt={stage.name}
                                fill
                                className="object-contain drop-shadow-md"
                                sizes="80px"
                            />
                        </div>
                    </div>

                    {/* 터치 유도 이펙트 (반짝!) */}
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Sparkles className="w-5 h-5 text-yellow-400 rotate-12" strokeWidth={3} />
                    </div>

                    {/* 레벨 뱃지 */}
                    <div className={`absolute -bottom-2 md:-bottom-1 -right-1 md:-right-2 px-2.5 py-1 bg-white rounded-full text-[11px] sm:text-xs font-black text-slate-800 shadow-md border-[2px] ${theme.ring.split(' ')[0]} flex items-center gap-0.5 z-20`}>
                        <Star className={`w-3 h-3 ${theme.icon} fill-current`} />
                        Lv.{stage.level}
                    </div>
                </div>

                {/* 오른쪽: 텍스트 및 말풍선 */}
                <div className="flex-1 min-w-0">
                    <div className="mb-1">
                        <span className="inline-block px-2 py-0.5 bg-white/70 rounded-md text-[10px] sm:text-xs font-bold text-slate-500 mb-1 shadow-sm border border-slate-100/50">
                            {stage.title}
                        </span>
                        <h2 className={`font-black tracking-tight text-lg sm:text-2xl pb-1.5 ${theme.title} truncate`}>
                            {stage.name}
                        </h2>
                    </div>

                    {/* 말풍선 꼬리표 (CSS) */}
                    <div className="relative mt-2">
                        <div className="absolute -left-1.5 top-2 w-3 h-3 bg-white/90 rotate-45 border-l border-b border-slate-200 z-0" />
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-sm p-3 shadow-sm border border-slate-200 z-10">
                            <p className="text-xs sm:text-sm font-bold text-slate-600 leading-snug break-keep">
                                "{displayMsg}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ------ 하단: 진화 진행도 바 (Progress Bars) ------ */}
            {next && (
                <div className="relative z-10 mt-5 space-y-3 bg-white/40 p-3 sm:p-4 rounded-2xl border border-white/50 shadow-inner">

                    {/* 1. 연속 출석 게이지 */}
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
                            <div
                                className={`h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-1000 ease-out relative`}
                                style={{ width: `${daysPct}%` }}
                            >
                                {/* 반짝이는 게이지 효과 (shimmer css 필요) */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>

                    {/* 2. 단어 마스터 게이지 */}
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
                            <div
                                className={`h-full bg-gradient-to-r ${theme.bar} rounded-full transition-all duration-1000 ease-out relative`}
                                style={{ width: `${wordsPct}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite_0.5s]" />
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* 마스터 달성 시 게이지 대신 축하 화면 */}
            {!next && (
                <div className="relative z-10 mt-5 bg-gradient-to-r from-amber-100/50 to-orange-100/50 p-4 rounded-2xl border border-amber-200 text-center animate-in fade-in zoom-in-95 duration-500">
                    <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-black text-amber-700 text-sm">모든 진화 단계를 마스터했습니다!</p>
                    <p className="font-bold text-amber-600/80 text-xs mt-0.5">앞으로도 단어 공부를 꾸준히 해주세요!</p>
                </div>
            )}

        </div>
    );
}
