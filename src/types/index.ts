export type User = {
    id: string;
    role: 'kid' | 'admin';
    nickname: string;
    tokens: number;
    created_at: string;
};

export type Word = {
    id: string;
    word: string;
    meaning: string;
    pronunciation?: string;
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
