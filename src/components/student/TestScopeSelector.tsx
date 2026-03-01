'use client';

import { useState } from 'react';
import { Word } from '@/types';
import { Check, CheckSquare, Dices, Layers } from 'lucide-react';
import clsx from 'clsx';

type Props = {
    words: Word[];
    onStartTest: (selectedWords: Word[]) => void;
};

export default function TestScopeSelector({ words, onStartTest }: Props) {
    const [mode, setMode] = useState<'all' | 'select' | null>(null);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

    const handleToggleWord = (id: string) => {
        const newSet = new Set(selectedWordIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedWordIds(newSet);
    };

    const handleStart = () => {
        if (mode === 'all') {
            onStartTest(words);
        } else if (mode === 'select') {
            const selectedWords = words.filter((w) => selectedWordIds.has(w.id));
            if (selectedWords.length === 0) {
                alert('단어를 최소 1개 이상 선택해 주세요!');
                return;
            }
            onStartTest(selectedWords);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-yellow-200">
            <div className="p-8 text-center bg-yellow-50">
                <h2 className="text-2xl font-black text-yellow-800 mb-2">시험 방식을 골라볼까? 🤔</h2>
                <p className="text-yellow-600 font-medium">어떤 단어들로 테스트를 볼지 선택해 줘!</p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setMode('all')}
                        className={clsx(
                            "p-6 rounded-2xl border-4 flex flex-col items-center justify-center transition-all duration-200",
                            mode === 'all'
                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]"
                                : "border-slate-100 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50"
                        )}
                    >
                        <Dices size={48} className={clsx("mb-3", mode === 'all' ? "text-blue-500" : "text-slate-300")} />
                        <span className="font-bold text-lg">전체 랜덤 출제</span>
                        <span className="text-sm opacity-80 mt-1">모든 단어 중 랜덤으로!</span>
                    </button>

                    <button
                        onClick={() => setMode('select')}
                        className={clsx(
                            "p-6 rounded-2xl border-4 flex flex-col items-center justify-center transition-all duration-200",
                            mode === 'select'
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md transform scale-[1.02]"
                                : "border-slate-100 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50"
                        )}
                    >
                        <CheckSquare size={48} className={clsx("mb-3", mode === 'select' ? "text-emerald-500" : "text-slate-300")} />
                        <span className="font-bold text-lg">내가 선택 출제</span>
                        <span className="text-sm opacity-80 mt-1">원하는 단어만 콕콕!</span>
                    </button>
                </div>

                {mode === 'select' && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center">
                                <Layers className="w-5 h-5 mr-2 text-emerald-500" />
                                단어 리스트 ({words.length}개)
                            </h3>
                            <button
                                onClick={() => {
                                    if (selectedWordIds.size === words.length) {
                                        setSelectedWordIds(new Set()); // deselect all
                                    } else {
                                        setSelectedWordIds(new Set(words.map(w => w.id))); // select all
                                    }
                                }}
                                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                            >
                                {selectedWordIds.size === words.length ? '전체 해제' : '전체 선택'}
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto rounded-xl border-2 border-slate-100 p-2 space-y-2 custom-scrollbar">
                            {words.map((word) => {
                                const isSelected = selectedWordIds.has(word.id);
                                return (
                                    <label
                                        key={word.id}
                                        className={clsx(
                                            "flex items-center p-3 rounded-lg cursor-pointer transition-colors border-2",
                                            isSelected ? "bg-emerald-50 border-emerald-200" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-6 h-6 rounded-md flex items-center justify-center mr-3 transition-colors border-2",
                                            isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300"
                                        )}>
                                            {isSelected && <Check size={16} strokeWidth={3} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 text-lg leading-tight">{word.word}</p>
                                            <p className="text-slate-500 text-sm">{word.meaning_1}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {mode && (
                    <button
                        onClick={handleStart}
                        className="w-full py-4 px-6 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-black text-xl flex items-center justify-center rounded-2xl shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                        🚀 테스트 시작하기!
                    </button>
                )}
            </div>
        </div>
    );
}
