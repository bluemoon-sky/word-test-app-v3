-- Users 테이블에 현재 해금된 Day 컬럼 추가 (기본값 1)
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_unlocked_day INTEGER DEFAULT 1;

-- 테스트 기록 테이블 생성
CREATE TABLE IF NOT EXISTS test_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    earned_tokens INTEGER NOT NULL DEFAULT 0,
    is_first_clear BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가 (사용자별 조회 성능)
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_user_day ON test_history(user_id, day_number);
