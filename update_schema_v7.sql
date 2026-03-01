-- 오답 노트 테이블
CREATE TABLE IF NOT EXISTS wrong_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE NOT NULL,
    failed_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_wrong_words_user ON wrong_words(user_id);

-- 연속 학습 streak 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_study_date DATE;
