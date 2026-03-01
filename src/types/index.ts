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
    current_unlocked_day?: number;
    current_streak?: number;
    last_study_date?: string;
    last_roulette_date?: string;
    created_at: string;
};

export type Word = {
    id: string;
    word: string;
    meaning_1: string;
    meaning_2?: string | null;
    meaning_3?: string | null;
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
    users?: User;
};

export type TestRequest = {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    users?: User;
};

export type TestHistory = {
    id: string;
    user_id: string;
    day_number: number;
    score: number;
    earned_tokens: number;
    is_first_clear: boolean;
    created_at: string;
};

export type WrongWord = {
    id: string;
    user_id: string;
    word_id: string;
    failed_count: number;
    created_at: string;
    words?: Word;
};
