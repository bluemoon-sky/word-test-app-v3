import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Vercel 빌드 시점(prerendering)에는 환경 변수가 없을 수 있으므로,
// 에러를 방지하기 위해 가짜(dummy) 클라이언트를 생성합니다.
export const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : createClient('https://build-dummy.supabase.co', 'dummy-key-for-build-only');
