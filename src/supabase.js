import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

// 環境変数が未設定の場合でもアプリがクラッシュしないようにする
let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
} else {
  console.warn('Supabase環境変数が未設定です (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)')
}

export { supabase }
