import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase URL:', supabaseUrl)

const email = process.argv[2] || 'jackyzhang1969@gmail.com'
const password = process.argv[3] || 'Test123456!'

async function registerUser() {
  console.log(`Attempting to register user: ${email}...`)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Registration failed:', error.message)
    process.exit(1)
  }

  console.log('Registration successful!')
  console.log('User ID:', data.user?.id)
  console.log('Confirmation sent:', !data.session) // If no session, usually means email confirmation required
}

registerUser()
