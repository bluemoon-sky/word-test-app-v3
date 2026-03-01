-- 럭키 보물상자 날짜 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_roulette_date DATE;
