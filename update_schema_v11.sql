-- 단어별 마스터 추적 테이블
CREATE TABLE IF NOT EXISTS user_word_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    word TEXT NOT NULL,
    is_mastered BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, day_number, word)
);
