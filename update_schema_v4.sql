-- Users 테이블에 시험 문항 수 컬럼 추가 (기본값 30)
ALTER TABLE users ADD COLUMN IF NOT EXISTS test_question_count INTEGER DEFAULT 30;
