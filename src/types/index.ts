export type User = {
    id: string;
    role: 'kid' | 'admin';
    nickname: string;
    tokens: number;
    daily_earned_tokens?: number;
    last_earn_date?: string;
    last_test_time?: string;
    last_wrong_word_ids?: string[];
    test_question_count?: number;
    created_at: string;
};

export type Word = {
    id: string;
    word: string;
    meaning_1: string;
    meaning_2?: string | null;
    phonetic?: string | null;
    korean_pronunciation?: string | null;
    category?: string | null;
    user_id?: string | null;
    created_at: string;
};

export type ExchangeRequest = {
    id: string;
    user_id: string;
    tokens_deducted: number;
    amount: number;
    status: 'pending' | 'completed';
    created_at: string;
    updated_at: string;
    users?: User; // joined data
};

// 시험 승인 요청 타입
export type TestRequest = {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    users?: User; // joined data
};
