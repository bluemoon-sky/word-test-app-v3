'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, CalendarHeart, Flame, Star, Trophy } from 'lucide-react';

// ============================================================================
// 1. 20?④퀎 ?꾩뒪??吏꾪솕 濡쒖쭅
// ============================================================================
const HAMSTER_STAGES = [
    // ?맋 釉뚮줎利?(Lv 1~5)
    { level: 1, minDays: 0, minWords: 0, title: '媛??쒖뼱??, name: '?먮컯???꾩뒪?? },
    { level: 2, minDays: 1, minWords: 5, title: '?덉쓣 ??, name: '?멸린???꾩뒪?? },
    { level: 3, minDays: 2, minWords: 15, title: '?ㅻ슧?ㅻ슧', name: '?꾧린 ?꾩뒪?? },
    { level: 4, minDays: 3, minWords: 30, title: '?대컮?쇨린??, name: '諛쒓껄???꾩뒪?? },
    { level: 5, minDays: 4, minWords: 50, title: '蹂쇰뵲援?鍮듬뭇', name: '癒밸낫 ?꾩뒪?? },
    // ?쪎 ?ㅻ쾭 (Lv 6~10)
    { level: 6, minDays: 6, minWords: 80, title: '泥대젰 利앹쭊', name: '?곕떇 ?꾩뒪?? },
    { level: 7, minDays: 8, minWords: 120, title: '?붾㉧由?援대━??, name: '泥쒖옱 ?꾩뒪?? },
    { level: 8, minDays: 11, minWords: 170, title: '?멸린??泥쒓뎅', name: '?먯젙 ?꾩뒪?? },
    { level: 9, minDays: 14, minWords: 230, title: '?쇱쇅 泥댁쭏', name: '?먰뿕媛 ?꾩뒪?? },
    { level: 10, minDays: 17, minWords: 300, title: '?닿났 紐⑤뱶', name: '?좊퉬 ?꾩뒪?? },
    // ?쪍 怨⑤뱶 (Lv 11~15)
    { level: 11, minDays: 21, minWords: 380, title: '留덈쾿?숆탳', name: '?좎엯???꾩뒪?? },
    { level: 12, minDays: 25, minWords: 470, title: '吏?앹쓽 ?섑샇??, name: '?ъ꽌 ?꾩뒪?? },
    { level: 13, minDays: 30, minWords: 570, title: '?곗＜濡??ν븯??, name: '濡쒖폆 ?꾩뒪?? },
    { level: 14, minDays: 35, minWords: 680, title: '踰덇컻瑜?遺瑜대뒗', name: '留덈쾿???꾩뒪?? },
    { level: 15, minDays: 40, minWords: 800, title: '?꾩꽕???낅Ц', name: '湲곗궗 ?꾩뒪?? },
    // ?뙂 臾댁?媛?(Lv 16~20)
    { level: 16, minDays: 46, minWords: 950, title: '?쒓컙??嫄곗뒪瑜대뒗', name: '?꾩옄 ?꾩뒪?? },
    { level: 17, minDays: 52, minWords: 1100, title: '紐⑤뱺 寃껋쓣 ?꾨뒗', name: '??꾩옄 ?꾩뒪?? },
    { level: 18, minDays: 59, minWords: 1250, title: '鍮쏅굹???뺢?', name: '?뺤떎 ?꾩뒪?? },
    { level: 19, minDays: 67, minWords: 1400, title: '?곗＜瑜??뺣났??, name: '??섍퀎 ?꾩뒪?? },
    { level: 20, minDays: 75, minWords: 1600, title: '?좏솕媛 ??, name: '?⑥뼱?????꾩뒪?? },
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
// 2. 留먰뭾???쒕뜡 ???
// ============================================================================
const BUBBLE_MESSAGES = [
    "?? 媛꾩??ъ썙 李뚯컢! >_<",
    "?ㅻ뒛???⑥뼱 怨듬? ?뚯씠??",
    "?대컮?쇨린??癒밴퀬 ?띕떎 ?몃눡",
    "?ㅼ쓬 ?덈꺼濡?媛蹂쇨퉴??!",
    "?곕떎?ъ뼱以섏꽌 怨좊쭏?뚯슂 ?맲",
    "李띿컢! 泥쒖옱媛 ??湲곕텇?댁뿉??",
    "議곌툑留????섎㈃ 吏꾪솕?댁슂 ?뵦",
    "寃뚯씠吏媛 ?μ뫁 ?щ씪??",
];

// ============================================================================
// 3. ?곗뼱蹂??뚮쭏 (諛곌꼍/?됱긽/寃뚯씠吏 ??
// ============================================================================
const getTheme = (level: number) => {
    // ?꾩뒪??蹂몄껜: ?곕쑜???щ┝/踰좎씠吏 ?? 諛곌꼍 ?뚮쭏留??곗뼱蹂?蹂寃?
    const hamster = { body: '#FFF5E6', belly: '#FFFFFF', cheek: '#FFB0B0', ear: '#F5D6B8', earInner: '#FFCACA', outline: '#D4A574' };
    if (level <= 5) return { ...hamster, bg: 'from-amber-50 via-orange-50/50 to-yellow-50/30', ring: 'border-orange-200', bar: 'from-orange-400 to-amber-500', title: 'text-orange-600', icon: 'text-orange-500' };
    if (level <= 10) return { ...hamster, bg: 'from-slate-50 via-blue-50/50 to-indigo-50/30', ring: 'border-blue-200', bar: 'from-blue-400 to-indigo-500', title: 'text-blue-600', icon: 'text-blue-500' };
    if (level <= 15) return { ...hamster, bg: 'from-yellow-50 via-amber-100/30 to-rose-50/30', ring: 'border-amber-300 shadow-lg', bar: 'from-amber-400 via-yellow-400 to-orange-500', title: 'text-amber-600', icon: 'text-amber-500' };
    return { ...hamster, bg: 'from-violet-50 via-fuchsia-50/50 to-cyan-50/50', ring: 'border-fuchsia-300 shadow-xl', bar: 'from-violet-500 via-fuchsia-500 to-cyan-500', title: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600', icon: 'text-fuchsia-500' };
};

// ============================================================================
// 4. SVG ?꾩뒪??罹먮┃??而댄룷?뚰듃 (?쒖닔 肄붾뱶濡??뚮뜑留?
// ============================================================================
function HamsterSVG({ level, bounce, blink }: { level: number; bounce: boolean; blink: boolean }) {
    const theme = getTheme(level);

    return (
        <svg
            viewBox="0 0 500 500"
            className={`w-full h-full transition-transform duration-300 ${bounce ? 'scale-110' : ''}`}
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}
        >



            {/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
            {/* ?? ?꾨줈?섏뀛??移댁???2?깆떊 ?꾩컡 (500x500) ?? */}
            {/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}

            {/* ?? defs: 洹몃┝?? 洹몃씪?붿뼵???? */}
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

            {/* ?꾩껜 ?⑥돩湲??좊땲硫붿씠??*/}
            <g>
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-6; 0,0" dur="2.2s" repeatCount="indefinite" />

                {/* ?? id="shadow": 諛붾떏 洹몃┝???? */}
                <g id="shadow">
                    <ellipse cx="250" cy="460" rx="120" ry="18" fill="#D4A574" opacity="0.15">
                        <animate attributeName="rx" values="120;110;120" dur="2.2s" repeatCount="indefinite" />
                    </ellipse>
                </g>

                {/* ?? id="body": 紐명넻 (?묎퀬 ?κ렐 李뱀??? ?? */}
                <g id="body">
                    <ellipse cx="250" cy="370" rx="110" ry="85" fill="url(#bodyGrad)" stroke={theme.outline} strokeWidth="4" strokeLinejoin="round" filter="url(#hamsterShadow)" />
                    {/* 諛?(?섏? 諛? */}
                    <ellipse cx="250" cy="380" rx="75" ry="55" fill={theme.belly} opacity="0.9" />
                </g>

                {/* ?? id="paws": ?욌컻/?룸컻 ?? */}
                <g id="paws">
                    {/* ?룸컻 (?쇱そ) */}
                    <ellipse cx="180" cy="440" rx="42" ry="22" fill={theme.ear} stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                    <ellipse cx="180" cy="442" rx="16" ry="8" fill="#FFCACA" opacity="0.5" />
                    {/* ?룸컻 (?ㅻⅨ履? */}
                    <ellipse cx="320" cy="440" rx="42" ry="22" fill={theme.ear} stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                    <ellipse cx="320" cy="442" rx="16" ry="8" fill="#FFCACA" opacity="0.5" />
                    {/* ?욌컻 (媛?댁뿉 紐⑥? ???? */}
                    <g>
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="2.2s" repeatCount="indefinite" />
                        <ellipse cx="215" cy="360" rx="22" ry="28" fill="url(#bodyGrad)" stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                        <ellipse cx="285" cy="360" rx="22" ry="28" fill="url(#bodyGrad)" stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                    </g>
                </g>

                {/* ?? id="head": 癒몃━ (?ш퀬 ?κ렐 2?깆떊 癒몃━) ?? */}
                <g id="head">
                    <circle cx="250" cy="220" r="130" fill="url(#headGrad)" stroke={theme.outline} strokeWidth="4" strokeLinejoin="round" />
                </g>

                {/* ?? id="ears": 洹 (?묎퀬 ?숆??숆?) ?? */}
                <g id="ears">
                    {/* ?쇱そ 洹 */}
                    <g>
                        <animateTransform attributeName="transform" type="rotate" values="-3,155,110;3,155,110;-3,155,110" dur="3s" repeatCount="indefinite" />
                        <ellipse cx="155" cy="110" rx="40" ry="48" fill={theme.ear} stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                        <ellipse cx="155" cy="114" rx="22" ry="30" fill={theme.earInner} />
                    </g>
                    {/* ?ㅻⅨ履?洹 */}
                    <g>
                        <animateTransform attributeName="transform" type="rotate" values="3,345,110;-3,345,110;3,345,110" dur="3s" repeatCount="indefinite" />
                        <ellipse cx="345" cy="110" rx="40" ry="48" fill={theme.ear} stroke={theme.outline} strokeWidth="3" strokeLinejoin="round" />
                        <ellipse cx="345" cy="114" rx="22" ry="30" fill={theme.earInner} />
                    </g>
                </g>

                {/* ?? id="face": ?쇨뎬 (??肄???蹂??섏뿼) ?? */}
                <g id="face">
                    {/* 蹂??곗튂 (鍮듬뭇?섍퀬 ?щ옉?ㅻ윭???뚯뒪???묓겕) */}
                    <ellipse cx="155" cy="255" rx="50" ry="32" fill="url(#cheekGradL)" opacity="0.7" />
                    <ellipse cx="345" cy="255" rx="50" ry="32" fill="url(#cheekGradR)" opacity="0.7" />

                    {/* ??(珥덈”珥덈”, 而ㅻ떎? 源뚮쭔 ?덈룞?? */}
                    {blink ? (
                        <>
                            <path d="M 195 210 Q 210 195 225 210" fill="none" stroke="#3D2C22" strokeWidth="8" strokeLinecap="round" />
                            <path d="M 275 210 Q 290 195 305 210" fill="none" stroke="#3D2C22" strokeWidth="8" strokeLinecap="round" />
                        </>
                    ) : (
                        <>
                            {/* ?덉븣 */}
                            <circle cx="210" cy="210" r="24" fill="#2C1810" />
                            <circle cx="290" cy="210" r="24" fill="#2C1810" />
                            {/* ?섏씠?쇱씠??1 (硫붿씤 鍮? */}
                            <circle cx="200" cy="200" r="9" fill="#FFFFFF" />
                            <circle cx="280" cy="200" r="9" fill="#FFFFFF" />
                            {/* ?섏씠?쇱씠??2 (蹂댁“ 鍮? */}
                            <circle cx="218" cy="218" r="5" fill="#FFFFFF" opacity="0.8" />
                            <circle cx="298" cy="218" r="5" fill="#FFFFFF" opacity="0.8" />
                            {/* ?섏씠?쇱씠??3 (誘몃땲) */}
                            <circle cx="205" cy="220" r="3" fill="#FFFFFF" opacity="0.5" />
                            <circle cx="285" cy="220" r="3" fill="#FFFFFF" opacity="0.5" />
                        </>
                    )}

                    {/* 肄?(議곌렇留??쇨컖 肄? */}
                    <path d="M 244 248 Q 250 256 256 248 L 250 253 Z" fill="#E8876B" stroke="#E8876B" strokeWidth="2" strokeLinejoin="round" />

                    {/* ??(??紐⑥뼇 = ? ?낅ℓ) */}
                    <path d="M 236 258 Q 243 270 250 258 Q 257 270 264 258" fill="none" stroke="#CC7766" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* ?섏뿼 (?묒そ 2媛?? */}
                    <line x1="110" y1="235" x2="165" y2="245" stroke="#E0C8B0" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <line x1="105" y1="255" x2="165" y2="252" stroke="#E0C8B0" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <line x1="335" y1="245" x2="390" y2="235" stroke="#E0C8B0" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <line x1="335" y1="252" x2="395" y2="255" stroke="#E0C8B0" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                </g>

                {/* ?? id="accessories": ?덈꺼蹂??꾩쟻 ?꾩씠???? */}
                <g id="accessories">
                    {/* ?? 釉뚮줎利??곗뼱 (Lv 2~5) ?? */}
                    {level >= 2 && (
                        <g>
                            <ellipse cx="290" cy="85" rx="28" ry="15" fill="#4ade80" transform="rotate(-30,290,85)" stroke="#22c55e" strokeWidth="3" />
                            <line x1="290" y1="85" x2="300" y2="72" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
                            <line x1="282" y1="90" x2="290" y2="80" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
                        </g>
                    )}
                    {level >= 3 && (
                        <g>
                            <path d="M200 330 C200 310, 230 318, 250 330 C270 318, 300 310, 300 330 C300 345, 280 340, 250 330 C220 340, 200 345, 200 330 Z" fill="#f472b6" stroke="#db2777" strokeWidth="4" strokeLinejoin="round" />
                            <circle cx="250" cy="330" r="10" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />
                        </g>
                    )}
                    {level >= 4 && (
                        <g>
                            <ellipse cx="370" cy="330" rx="22" ry="14" fill="#fbbf24" stroke="#b45309" strokeWidth="3" transform="rotate(20,370,330)" />
                            <ellipse cx="370" cy="330" rx="14" ry="7" fill="#fcd34d" transform="rotate(20,370,330)" />
                        </g>
                    )}
                    {level >= 5 && (
                        <g>
                            <circle cx="148" cy="250" r="18" fill={theme.cheek} opacity="0.85" />
                            <circle cx="352" cy="250" r="18" fill={theme.cheek} opacity="0.85" />
                            <circle cx="142" cy="244" r="5" fill="white" opacity="0.5" />
                            <circle cx="346" cy="244" r="5" fill="white" opacity="0.5" />
                        </g>
                    )}

                    {/* ?? ?ㅻ쾭 ?곗뼱 (Lv 6~10) ?? */}
                    {level >= 6 && (
                        <g>
                            <rect x="140" y="115" width="220" height="18" rx="9" fill="#ef4444" opacity="0.95" />
                            <rect x="140" y="122" width="220" height="6" fill="#fca5a5" opacity="0.8" />
                        </g>
                    )}
                    {level >= 7 && (
                        <g>
                            <circle cx="210" cy="210" r="30" fill="none" stroke="#1f2937" strokeWidth="7" />
                            <circle cx="290" cy="210" r="30" fill="none" stroke="#1f2937" strokeWidth="7" />
                            <line x1="240" y1="210" x2="260" y2="210" stroke="#1f2937" strokeWidth="7" />
                            <line x1="180" y1="200" x2="145" y2="185" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
                            <line x1="320" y1="200" x2="355" y2="185" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
                        </g>
                    )}
                    {level >= 8 && (
                        <g>
                            <circle cx="108" cy="320" r="24" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="5" />
                            <line x1="128" y1="340" x2="150" y2="370" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
                        </g>
                    )}
                    {level >= 9 && (
                        <g>
                            <rect x="340" y="290" width="52" height="60" rx="12" fill="#d97706" stroke="#92400e" strokeWidth="4" />
                            <rect x="346" y="305" width="40" height="18" rx="6" fill="#f59e0b" />
                            <circle cx="366" cy="335" r="6" fill="#fbbf24" />
                        </g>
                    )}
                    {level >= 10 && (
                        <g>
                            <rect x="360" y="310" width="48" height="34" rx="4" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="3" transform="rotate(-10,384,327)" />
                            <line x1="384" y1="310" x2="384" y2="344" stroke="#1e3a8a" strokeWidth="3" transform="rotate(-10,384,327)" />
                        </g>
                    )}

                    {/* ?? 怨⑤뱶 ?곗뼱 (Lv 11~15) ?? */}
                    {level >= 11 && (
                        <g>
                            <polygon points="250,10 170,130 330,130" fill="#4f46e5" stroke="#fef08a" strokeWidth="5" strokeLinejoin="round" />
                            <rect x="156" y="118" width="188" height="18" rx="9" fill="#facc15" stroke="#ca8a04" strokeWidth="3" />
                        </g>
                    )}
                    {level >= 12 && (
                        <text x="220" y="25" fontSize="50" style={{ transformOrigin: '250px 10px' }}>
                            <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="2s" repeatCount="indefinite" />
                            狩?
                        </text>
                    )}
                    {level >= 13 && (
                        <g>
                            <line x1="395" y1="270" x2="440" y2="150" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
                            <circle cx="440" cy="150" r="16" fill="#fef08a" stroke="#ca8a04" strokeWidth="3" />
                            <circle cx="440" cy="150" r="22" fill="#fef08a" opacity="0.4">
                                <animate attributeName="r" values="18;28;18" dur="1s" repeatCount="indefinite" />
                            </circle>
                        </g>
                    )}
                    {level >= 14 && (
                        <g>
                            <path d="M125 290 Q80 360 125 435 L250 410 L375 435 Q420 360 375 290" fill="#6d28d9" opacity="0.75" />
                            <path d="M125 290 Q80 360 125 435 L250 410 L375 435 Q420 360 375 290" fill="none" stroke="#fde047" strokeWidth="5" opacity="0.85" />
                        </g>
                    )}
                    {level >= 15 && (
                        <>
                            <text x="70" y="100" fontSize="32" opacity="0.7">??/text>
                            <text x="390" y="95" fontSize="28" opacity="0.5">
                                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                                ??
                            </text>
                        </>
                    )}

                    {/* ?? 臾댁?媛??곗뼱 (Lv 16~20) ?? */}
                    {level >= 16 && (
                        <g>
                            <polygon points="158,130 175,50 210,100 250,25 290,100 325,50 342,130" fill="#facc15" stroke="#b45309" strokeWidth="4" strokeLinejoin="round" />
                            <rect x="150" y="118" width="200" height="18" rx="6" fill="#eab308" />
                        </g>
                    )}
                    {level >= 17 && (
                        <g>
                            <circle cx="210" cy="80" r="12" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
                            <circle cx="250" cy="55" r="15" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                            <circle cx="290" cy="80" r="12" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
                            <circle cx="248" cy="50" r="5" fill="white" opacity="0.8" />
                        </g>
                    )}
                    {level >= 18 && (
                        <circle cx="250" cy="280" r="210" fill="url(#auraGrad18)" opacity="0.18">
                            <animate attributeName="r" values="200;220;200" dur="2s" repeatCount="indefinite" />
                        </circle>
                    )}
                    {level >= 19 && (
                        <g>
                            <text x="40" y="200" fontSize="36" opacity="0.9">狩?
                                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                            </text>
                            <text x="415" y="220" fontSize="42" opacity="0.9">?뙚
                                <animate attributeName="y" values="220;190;220" dur="2s" repeatCount="indefinite" />
                            </text>
                        </g>
                    )}
                    {level >= 20 && (
                        <g>
                            <path d="M40 430 A210 210 0 0 1 460 430" fill="none" stroke="#ef4444" strokeWidth="10" opacity="0.8" />
                            <path d="M55 430 A195 195 0 0 1 445 430" fill="none" stroke="#f59e0b" strokeWidth="10" opacity="0.8" />
                            <path d="M70 430 A180 180 0 0 1 430 430" fill="none" stroke="#eab308" strokeWidth="10" opacity="0.8" />
                            <path d="M85 430 A165 165 0 0 1 415 430" fill="none" stroke="#22c55e" strokeWidth="10" opacity="0.8" />
                            <path d="M100 430 A150 150 0 0 1 400 430" fill="none" stroke="#3b82f6" strokeWidth="10" opacity="0.8" />
                            <path d="M115 430 A135 135 0 0 1 385 430" fill="none" stroke="#8b5cf6" strokeWidth="10" opacity="0.8" />
                        </g>
                    )}
                </g>

            </g>

        </svg>
        </svg>
    );
}

// ============================================================================
// 5. 硫붿씤 PetAvatar 而댄룷?뚰듃
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

    // 二쇨린????源쒕묀??(3~5珥?媛꾧꺽, 0.15珥?媛먯븯????
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
        if (!next) return '?곗＜ 理쒓컯???⑥뼱 留덉뒪?? ?몣';
        if (needDays > 0 && needWords > 0) return `${needDays}?????ㅺ퀬, ?⑥뼱 ${needWords}媛??몄슦??`;
        if (needDays > 0) return `?⑥뼱???꾨꼍?? 異쒖꽍 ${needDays}???쏆툩怨? ?룂`;
        if (needWords > 0) return `?⑥뼱 ${needWords}媛쒕쭔 ??留덉뒪?고븯硫?吏꾪솕! ??;
        return `議곌굔 ?ъ꽦! 怨?吏꾪솕?댁슂! ?럦`;
    };

    const displayMsg = msgIndex !== -1 ? BUBBLE_MESSAGES[msgIndex] : getDefaultMsg();

    if (!isMounted) return <div className="animate-pulse bg-slate-100 rounded-3xl h-48 w-full" />;

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} rounded-3xl border-[3px] ${theme.ring} p-4 sm:p-5 transition-colors duration-700`}>
            <div className="absolute inset-0 bg-white/10 z-0 pointer-events-none" />

            {/* ?곷떒: 罹먮┃??+ ?뺣낫 */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">

                {/* SVG 罹먮┃???곸뿭 */}
                <div
                    className="relative shrink-0 cursor-pointer group flex flex-col items-center"
                    onClick={handleInteract}
                    title="?瑜??곗튂?댁＜?몄슂 李뚯컢!"
                >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center relative">
                        <HamsterSVG level={stage.level} bounce={bounce} blink={blink} />
                    </div>

                    {/* ?곗튂 ?좊룄 */}
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Sparkles className="w-5 h-5 text-yellow-400 rotate-12" strokeWidth={3} />
                    </div>

                    {/* ?덈꺼 諭껋? (罹먮┃??以묒븰 ?꾨옒) */}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white rounded-full text-[11px] sm:text-xs font-black text-slate-800 shadow-md border-[2px] ${theme.ring.split(' ')[0]} flex items-center gap-1 z-20 whitespace-nowrap`}>
                        <Star className={`w-3.5 h-3.5 ${theme.icon} fill-current`} />
                        Lv.{stage.level}
                    </div>
                </div>

                {/* ?대쫫 + 留먰뭾??*/}
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

            {/* ?섎떒: 吏꾪뻾??諛?*/}
            {next && (
                <div className="relative z-10 mt-5 space-y-3 bg-white/40 p-3 sm:p-4 rounded-2xl border border-white/50 shadow-inner">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <CalendarHeart className="w-4 h-4 text-rose-500" />
                                <span className="text-xs font-bold text-slate-700">?곗냽 異쒖꽍</span>
                            </div>
                            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500">
                                <span className={daysPct >= 100 ? 'text-rose-600' : 'text-slate-800'}>{currentStreak}</span> / {next.minDays}??
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
                                <span className="text-xs font-bold text-slate-700">留덉뒪???⑥뼱</span>
                            </div>
                            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500">
                                <span className={wordsPct >= 100 ? 'text-orange-600' : 'text-slate-800'}>{totalMasteredCount}</span> / {next.minWords}?⑥뼱
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
                    <p className="font-black text-amber-700 text-sm">紐⑤뱺 吏꾪솕 ?④퀎瑜?留덉뒪?고뻽?듬땲??</p>
                    <p className="font-bold text-amber-600/80 text-xs mt-0.5">?욎쑝濡쒕룄 袁몄???怨듬??댁＜?몄슂!</p>
                </div>
            )}
        </div>
    );
}
