-- 앱 설정 테이블 (관리자 비밀번호 등)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 기본 관리자 비밀번호 삽입
INSERT INTO app_settings (key, value) VALUES ('admin_pin', '1234')
ON CONFLICT (key) DO NOTHING;
