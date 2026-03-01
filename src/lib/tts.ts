// Web Speech API TTS 유틸리티
export function speakWord(word: string, lang: string = 'en-US') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // 현재 재생 중이면 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.85; // 약간 느리게 (학습용)
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}
