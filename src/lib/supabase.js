import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zurvrpispswzpkydpmvc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cnZycGlzcHN3enBreWRwbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzE2MDcsImV4cCI6MjA4MDQ0NzYwN30.7W2fB8vixXxvJSC-tTEMHYnT6uXol9g20YHdN_k0-nc'

// 调试：打印环境变量
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)
console.log('Supabase Key length:', supabaseAnonKey?.length)
console.log('Supabase Key first 20 chars:', supabaseAnonKey?.substring(0, 20))

// 创建客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase client created:', !!supabase)
