
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// 使用 .env 中的变量
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 缺少 Supabase URL 或 Anon Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSubmission() {
  console.log('--- 开始测试咨询提交 (Guest Mode) ---')

  const payload = {
    name: 'Debug User',
    email: 'debug@example.com',
    question: '这是一条测试数据，用于调试数据库写入问题。',
    deadline: new Date().toISOString().split('T')[0], // 今天
    status: 'pending',
    // user_id: null // 模拟未登录
  }

  console.log('尝试插入数据:', payload)

  const { data, error } = await supabase
    .from('consultations')
    .insert([payload])
    .select()

  if (error) {
    console.error('❌ 插入失败!')
    console.error('错误代码:', error.code)
    console.error('错误信息:', error.message)
    console.error('错误详情:', error.details)
    console.error('提示:', error.hint)
  } else {
    console.log('✅ 插入成功!')
    console.log('返回数据:', data)
  }
}

testSubmission()
