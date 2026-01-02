# Admin Authentication Spec

## MODIFIED Requirements

### Requirement: Admin login SHALL query correct table
AdminLogin component SHALL query `aa_profiles` table (not `profiles`) to verify admin role.

#### Scenario: Admin logs in successfully
Given an admin user exists in `aa_profiles` with `role = 'admin'`
When the admin enters valid email and password at `/admin/login`
Then the system authenticates via Supabase Auth
And queries `aa_profiles` for the user's role
And redirects to `/admin/dashboard` if role is 'admin'

#### Scenario: Non-admin user attempts admin login
Given a user exists with `role != 'admin'`
When the user attempts to login at `/admin/login`
Then the system signs them out immediately
And displays error message "您无权访问此管理页面"
