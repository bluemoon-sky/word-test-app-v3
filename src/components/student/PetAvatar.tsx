'use client';

import Image from 'next/image';

// 햄스터 10단계 다중 조건 성장 시스템
// 출석 일수(minDays)와 마스터 단어 수(minWords) 두 조건을 모두 충족해야 진화
const PET_STAGES = [
    { level: 1, minDays: 0, minWords: 0, name: '아기 햄스터', title: '갓 태어난 아기', desc: '드디어 공부 시작! 귀여운 아기 햄스터가 태어났어요!', color: 'from-amber-100 to-orange-50', border: 'border-amber-200', ring: '' },
    { level: 2, minDays: 2, minWords: 10, name: '솜뭉치 햄스터', title: '눈을 뜬 솜뭉치', desc: '눈을 떴어요! 세상이 궁금한 솜뭉치 햄스터!', color: 'from-yellow-100 to-amber-50', border: 'border-yellow-200', ring: '' },
    { level: 3, minDays: 4, minWords: 30, name: '탐험가 햄스터', title: '해바라기씨를 발견!', desc: '첫 해바라기씨를 발견했어요! 맛있다!', color: 'from-lime-100 to-green-50', border: 'border-lime-200', ring: '' },
    { level: 4, minDays: 7, minWords: 60, name: '러너 햄스터', title: '쳇바퀴의 달인', desc: '쳇바퀴를 타기 시작했어요! 에너지 폭발!', color: 'from-cyan-100 to-sky-50', border: 'border-cyan-200', ring: '' },
    { level: 5, minDays: 10, minWords: 100, name: '먹보 햄스터', title: '볼따구 폭발', desc: '볼에 간식을 가득! 볼따구가 터질 것 같아요!', color: 'from-orange-100 to-amber-50', border: 'border-orange-200', ring: '' },
    { level: 6, minDays: 15, minWords: 150, name: '학자 햄스터', title: '책읽는 똑똑이', desc: '책을 읽기 시작했어요! 지식이 쑥쑥 올라요!', color: 'from-emerald-100 to-teal-50', border: 'border-emerald-200', ring: 'ring-2 ring-emerald-200' },
    { level: 7, minDays: 20, minWords: 220, name: '학사 햄스터', title: '학사모를 쓴 수재', desc: '학사모를 쓴 멋진 햄스터! 거의 천재급!', color: 'from-blue-100 to-indigo-50', border: 'border-blue-200', ring: 'ring-2 ring-blue-200' },
    { level: 8, minDays: 30, minWords: 300, name: '마법사 햄스터', title: '마법 지팡이의 힘', desc: '마법 지팡이를 얻었어요! 초강력 마법 시전!', color: 'from-purple-100 to-violet-50', border: 'border-purple-200', ring: 'ring-2 ring-purple-300' },
    { level: 9, minDays: 45, minWords: 400, name: '햄스터 왕', title: '왕관의 주인공', desc: '왕관을 쓴 햄스터 왕! 모든 단어를 지배한다!', color: 'from-amber-100 to-yellow-50', border: 'border-amber-300', ring: 'ring-2 ring-amber-300' },
    { level: 10, minDays: 60, minWords: 500, name: '마스터 햄스터', title: '우주를 탐험하는 영웅', desc: '최종 진화! 우주를 탐험하는 영단어 마스터 햄스터!', color: 'from-indigo-100 via-purple-100 to-pink-100', border: 'border-indigo-300', ring: 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-200/50' },
];

// 현재 레벨 계산: 두 조건을 모두 충족하는 최고 레벨 반환
function getStage(streak: number, masteredWords: number) {
    let current = PET_STAGES[0];
    for (const stage of PET_STAGES) {
        if (streak >= stage.minDays && masteredWords >= stage.minWords) {
            current = stage;
        }
    }
    return current;
}

// 다음 진화 단계 정보 반환
function getNextStage(streak: number, masteredWords: number) {
    const currentStage = getStage(streak, masteredWords);
    const currentIdx = PET_STAGES.indexOf(currentStage);
    if (currentIdx < PET_STAGES.length - 1) {
        return PET_STAGES[currentIdx + 1];
    }
    return null;
}

type Props = {
    currentStreak: number;       // 연속 출석 일수
    totalMasteredCount: number;  // 전체 마스터 단어 수
};

export default function PetAvatar({ currentStreak, totalMasteredCount }: Props) {
    const stage = getStage(currentStreak, totalMasteredCount);
    const next = getNextStage(currentStreak, totalMasteredCount);

    // 다음 단계까지의 진행률 계산
    const daysProgress = next ? Math.min((currentStreak / next.minDays) * 100, 100) : 100;
    const wordsProgress = next ? Math.min((totalMasteredCount / next.minWords) * 100, 100) : 100;

    // 부족한 조건에 따른 동적 격려 메시지
    const getBubbleMsg = () => {
        if (!next) return '🏆 최종 진화 완료! 당신은 진정한 영단어 마스터!';

        const needDays = next.minDays - currentStreak;
        const needWords = next.minWords - totalMasteredCount;
        const dayShort = needDays > 0;
        const wordShort = needWords > 0;

        if (dayShort && wordShort) {
            return `다음 진화까지 출석 ${needDays}일, 단어 ${needWords}개 더 필요해요! 힘내요! 💪`;
        } else if (dayShort) {
            return `단어는 충분해요! 출석 ${needDays}일만 더 채우면 진화해요! 🔥`;
        } else if (wordShort) {
            return `출석은 충분해요! 단어 ${needWords}개만 더 마스터하면 진화해요! ✨`;
        }
        return `조건 달성! 곧 진화할 수 있어요! 🎉`;
    };

    return (
        <div className={`bg-gradient-to-br ${stage.color} rounded-2xl border-2 ${stage.border} ${stage.ring} p-3 sm:p-4 transition-all duration-500`}>
            <div className="flex items-center gap-3">
                {/* 햄스터 이미지 */}
                <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/60 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden">
                        <div className="animate-[float_3s_ease-in-out_infinite] w-14 h-14 sm:w-[72px] sm:h-[72px] relative">
                            <Image
                                src={`/images/pets/hamster/lv${stage.level}.png`}
                                alt={stage.name}
                                fill
                                className="object-contain drop-shadow-md"
                                sizes="72px"
                            />
                        </div>
                    </div>
                    {/* 레벨 뱃지 */}
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-white rounded-full text-[9px] font-black text-slate-700 shadow border border-slate-200">
                        Lv.{stage.level}
                    </div>
                </div>

                {/* 정보 및 말풍선 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-black text-slate-800 text-xs sm:text-sm truncate">{stage.name}</p>
                        <span className="shrink-0 px-1.5 py-0.5 bg-white/60 rounded-full text-[9px] font-bold text-slate-500">
                            {stage.title}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-relaxed line-clamp-2 mb-2">
                        💬 {getBubbleMsg()}
                    </p>

                    {/* 프로그레스 바 2개 */}
                    {next && (
                        <div className="space-y-1.5">
                            {/* 출석 진행률 */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-orange-500 w-8 shrink-0">🔥출석</span>
                                <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-700"
                                        style={{ width: `${daysProgress}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 w-10 text-right shrink-0">
                                    {currentStreak}/{next.minDays}일
                                </span>
                            </div>
                            {/* 단어 학습 진행률 */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-emerald-500 w-8 shrink-0">📚단어</span>
                                <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700"
                                        style={{ width: `${wordsProgress}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 w-12 text-right shrink-0">
                                    {totalMasteredCount}/{next.minWords}개
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
