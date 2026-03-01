-- Words 테이블에 meaning_3 컬럼 추가
ALTER TABLE words ADD COLUMN IF NOT EXISTS meaning_3 TEXT;
