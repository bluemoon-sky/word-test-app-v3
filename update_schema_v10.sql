-- 사용자별 학습 단어 수
ALTER TABLE users ADD COLUMN IF NOT EXISTS study_word_count INTEGER DEFAULT 20;
