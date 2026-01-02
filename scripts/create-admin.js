import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://localhost:8002'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3NDQwMDkyMDAsCiAgImV4cCI6IDI1MjQ2MDgwMDAKfQ.8wwASuQAgAqO9LDYcU1KEdHtF4XGf8_A85FOGVz0TIY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
  const email = 'admin@askamy.vip'
  const password = 'Super20220103!'

  // Create user via admin API
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (userError) {
    console.error('Error creating user:', userError.message)
    return
  }

  console.log('User created:', userData.user.id)

  // Update profile to admin role
  const { error: profileError } = await supabase
    .from('aa_profiles')
    .update({ role: 'admin' })
    .eq('id', userData.user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError.message)
    return
  }

  console.log('Admin user created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
}

createAdmin()
