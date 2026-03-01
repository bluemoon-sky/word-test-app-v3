-- Words 테이블에 카테고리 컬럼 추가
ALTER TABLE words ADD COLUMN IF NOT EXISTS category TEXT;
