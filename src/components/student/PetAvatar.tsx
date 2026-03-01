'use client';

// 펫 진화 단계 정의
const PET_STAGES = [
    { minDay: 1, emoji: '🥚', name: '알', desc: '드디어 공부 시작! 알에서 뭔가 꿈틀거려요...', color: 'from-amber-100 to-orange-100', border: 'border-amber-200' },
    { minDay: 2, emoji: '🐣', name: '아기 몬스터', desc: '부화했어요! 아기 몬스터가 탄생했어요!', color: 'from-yellow-100 to-amber-100', border: 'border-yellow-200' },
    { minDay: 4, emoji: '🐥', name: '꼬마 몬스터', desc: '눈을 떴어요! 세상이 궁금한 꼬마 몬스터!', color: 'from-yellow-50 to-yellow-100', border: 'border-yellow-300' },
    { minDay: 6, emoji: '🐤', name: '걸음마 몬스터', desc: '걷기 시작했어요! 어디든 갈 수 있어요!', color: 'from-orange-50 to-amber-100', border: 'border-orange-200' },
    { minDay: 8, emoji: '🐦', name: '날개 몬스터', desc: '날개가 돋았어요! 하늘을 날 수 있어요!', color: 'from-sky-50 to-blue-100', border: 'border-sky-200' },
    { minDay: 10, emoji: '🐲', name: '아기 드래곤', desc: '1단계 진화 완료! 멋진 드래곤으로 변신!', color: 'from-emerald-50 to-teal-100', border: 'border-emerald-200' },
    { minDay: 15, emoji: '🔥🐲', name: '불꽃 드래곤', desc: '불을 뿜을 수 있어요! 강력해지고 있어요!', color: 'from-red-50 to-orange-100', border: 'border-red-200' },
    { minDay: 20, emoji: '🐉', name: '전설의 드래곤', desc: '2단계 진화! 전설의 드래곤이 되었어요!', color: 'from-purple-50 to-indigo-100', border: 'border-purple-200' },
    { minDay: 30, emoji: '⚡🐉', name: '번개 드래곤', desc: '번개를 다루는 초강력 드래곤!', color: 'from-blue-50 to-cyan-100', border: 'border-blue-200' },
    { minDay: 40, emoji: '🌟🐉', name: '빛나는 드래곤', desc: '온 세상을 비추는 빛의 드래곤!', color: 'from-yellow-50 to-amber-50', border: 'border-yellow-300' },
    { minDay: 50, emoji: '👑🐉', name: '드래곤 킹', desc: '최종 진화! 용돈의 제왕이 되었어요!', color: 'from-amber-50 to-yellow-100', border: 'border-amber-300' },
];

function getStage(day: number) {
    let current = PET_STAGES[0];
    for (const stage of PET_STAGES) {
        if (day >= stage.minDay) current = stage;
    }
    return current;
}

function getNextStage(day: number) {
    for (const stage of PET_STAGES) {
        if (day < stage.minDay) return stage;
    }
    return null;
}

type Props = {
    currentDay: number;
};

export default function PetAvatar({ currentDay }: Props) {
    const stage = getStage(currentDay);
    const next = getNextStage(currentDay);

    // 격려 말풍선 메시지
    const getBubbleMsg = () => {
        if (next) {
            const daysLeft = next.minDay - currentDay;
            if (daysLeft === 1) return `주인님! Day ${next.minDay} 깨면 ${next.name}(으)로 진화해요! 오늘 꼭 해봐요! 💪`;
            return `Day ${next.minDay}까지 ${daysLeft}일 남았어요! ${next.emoji} 진화가 기다려요!`;
        }
        return '최종 진화 완료! 당신은 진정한 영단어 마스터! 🏆';
    };

    return (
        <div className={`bg-gradient-to-br ${stage.color} rounded-2xl border-2 ${stage.border} p-3 sm:p-4 flex items-center gap-3`}>
            {/* 펫 이모지 */}
            <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/70 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner animate-bounce" style={{ animationDuration: '3s' }}>
                    {stage.emoji}
                </div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-white rounded-full text-[9px] font-black text-slate-600 shadow border">
                    Lv.{PET_STAGES.indexOf(stage) + 1}
                </div>
            </div>

            {/* 말풍선 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-black text-slate-800 text-xs sm:text-sm truncate">{stage.name}</p>
                    {next && (
                        <span className="shrink-0 px-1.5 py-0.5 bg-white/60 rounded-full text-[9px] font-bold text-slate-500">
                            다음: {next.emoji}
                        </span>
                    )}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                    💬 {getBubbleMsg()}
                </p>
            </div>
        </div>
    );
}
