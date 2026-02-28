export const englishToKoreanPronunciation = (word: string): string => {
    // 소문자 변환 및 양옆 공백 제거
    const w = word.toLowerCase().trim();
    if (!w) return '';

    // 예외 사전: 자주 쓰이거나 규칙에서 벗어나는 단어들 하드코딩
    const exceptions: Record<string, string> = {
        'apple': '애플',
        'orange': '오렌지',
        'banana': '바나나',
        'grape': '그레이프',
        'water': '워터',
        'computer': '컴퓨터',
        'phone': '폰',
        'book': '북',
        'desk': '데스크',
        'chair': '체어',
        'pencil': '펜슬',
        'school': '스쿨',
        'friend': '프렌드',
        'family': '패밀리',
        'house': '하우스',
        'car': '카',
        'bus': '버스',
        'train': '트레인',
        'airplane': '에어플레인',
        'music': '뮤직',
        'movie': '무비',
        'student': '스튜던트',
        'teacher': '티처',
        'dog': '도그',
        'cat': '캣',
        'bird': '버드',
        'tiger': '타이거',
        'lion': '라이언',
        'elephant': '엘리펀트',
        'hello': '헬로',
        'world': '월드',
        'good': '굿',
        'morning': '모닝',
        'night': '나이트',
        'time': '타임',
        'day': '데이',
        'week': '위크',
        'month': '먼스',
        'year': '이어',
        'happy': '해피',
        'sad': '새드',
        'angry': '앵그리',
        'love': '러브',
        'like': '라이크',
        'hate': '헤이트',
    };

    if (exceptions[w]) return exceptions[w];

    // 매우 간단한 휴리스틱 변환 (실제 발음기호 API를 쓰지 않는 한 한계가 큼)
    // admin이 입력할 때 "초안"으로 제공하는 용도임
    let res = w;

    // 모음 조합
    res = res.replace(/ee/g, '이');
    res = res.replace(/ea/g, '이');
    res = res.replace(/oo/g, '우');
    res = res.replace(/ou/g, '아우');
    res = res.replace(/ow/g, '아우');
    res = res.replace(/au/g, '오');
    res = res.replace(/aw/g, '오');
    res = res.replace(/oa/g, '오');
    res = res.replace(/oy/g, '오이');
    res = res.replace(/oi/g, '오이');

    // 자음 조합
    res = res.replace(/th/g, '스');
    res = res.replace(/sh/g, '쉬');
    res = res.replace(/ch/g, '치');
    res = res.replace(/ph/g, '프');
    res = res.replace(/ck/g, '크');
    res = res.replace(/ng/g, '응');

    // 끝나는 e (묵음 처리 시도)
    res = res.replace(/([a-z])e$/g, '$1');

    // 단일 자음
    const consonants: Record<string, string> = {
        'b': 'ㅂ', 'c': 'ㅋ', 'd': 'ㄷ', 'f': 'ㅍ', 'g': 'ㄱ',
        'h': 'ㅎ', 'j': 'ㅈ', 'k': 'ㅋ', 'l': 'ㄹ', 'm': 'ㅁ',
        'n': 'ㄴ', 'p': 'ㅍ', 'q': 'ㅋ', 'r': 'ㄹ', 's': 'ㅅ',
        't': 'ㅌ', 'v': 'ㅂ', 'w': '우', 'x': '엑스', 'y': '이', 'z': 'ㅈ'
    };

    // 단일 모음
    const vowels: Record<string, string> = {
        'a': '아', 'e': '에', 'i': '이', 'o': '오', 'u': '우'
    };

    let converted = '';
    for (let i = 0; i < res.length; i++) {
        const char = res[i];
        if (vowels[char]) converted += vowels[char];
        else if (consonants[char]) converted += consonants[char];
        else converted += char;
    }

    // 매우 거친 변환이므로, 한글 자음/모음이 분리된 채로 나올 수 있음.
    // 뷰단에서는 이것을 "자동 완성 초안" 정도로만 보여주고 수정하도록 안내해야 함.
    return converted;
};
