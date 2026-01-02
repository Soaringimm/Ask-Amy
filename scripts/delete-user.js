import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env file.')
  console.log('Please ensure you have the service role key (not just the anon key) to perform admin deletions.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const emailToDelete = process.argv[2] || 'jackyzhang1969@gmail.com'

async function deleteUser() {
  console.log(`Searching for user: ${emailToDelete}...`)

  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error)
    process.exit(1)
  }

  const user = users.find(u => u.email === emailToDelete)

  if (!user) {
    console.log('User not found in the database.')
    return
  }

  console.log(`Found user ID: ${user.id}. Deleting...`)

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('Error deleting user:', deleteError)
    process.exit(1)
  }

  console.log(`User ${emailToDelete} successfully deleted.`)
}

deleteUser()
