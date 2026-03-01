-- Words 테이블 컬럼명 변경 (기존 meaning -> meaning_1)
ALTER TABLE words RENAME COLUMN meaning TO meaning_1;

-- Words 테이블 신규 컬럼 (발음기호, 한국어 발음) 추가
ALTER TABLE words ADD COLUMN IF NOT EXISTS phonetic TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS korean_pronunciation TEXT;
