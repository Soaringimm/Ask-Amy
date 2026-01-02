# Tasks: Fix Admin Login

## 1. Fix Table Name Bug
- [x] 1.1 Update `AdminLogin.jsx` line 32: change `.from('profiles')` to `.from('aa_profiles')`

## 2. Create Admin User
- [x] 2.1 Create admin user in Supabase Auth (via SQL or Supabase dashboard)
- [x] 2.2 Insert admin profile into `aa_profiles` table with `role = 'admin'`

## 3. Test Admin Login Flow
- [x] 3.1 Navigate to `/admin/login`
- [x] 3.2 Enter admin credentials
- [x] 3.3 Verify redirect to `/admin/dashboard`
- [x] 3.4 Verify admin dashboard displays correctly
- [x] 3.5 Verify `/admin/articles` is accessible
