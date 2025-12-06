# Design: User Management Architecture

## Database Schema (Supabase)

We will introduce a `public.profiles` table to extend `auth.users`. This is a standard Supabase pattern.

### Table: `public.profiles`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, References `auth.users.id` (ON DELETE CASCADE) |
| `email` | `text` | Copied from auth.users for easier querying (optional but helpful) |
| `display_name` | `text` | User's public name |
| `wechat_id` | `text` | Crucial for communication in this domain |
| `avatar_url` | `text` | URL to storage |
| `role` | `text` | 'admin' or 'client' (default: 'client') |
| `created_at` | `timestamptz` | Creation time |
| `updated_at` | `timestamptz` | Last update time |

### Triggers
-   **`on_auth_user_created`**: Automatically inserts a row into `public.profiles` when a new user signs up via Supabase Auth.

### RLS Policies
1.  **Public Profiles**: Viewable by owner and admin.
    *   `SELECT` using `auth.uid() = id` OR `auth.jwt() ->> 'role' = 'admin'` (or checking the `role` column if we trust it, usually safer to check a claim or use a separate admin table, but for this scale, checking the row is okay *if* RLS allows reading the role).
    *   *Refinement*: To prevent circular RLS, we often assume 'admin' is determined by a specific flag or just the `role` column.
    *   **Policy 1 (View)**: `auth.uid() = id` OR `exists(select 1 from profiles where id = auth.uid() and role = 'admin')`
    *   **Policy 2 (Update)**: `auth.uid() = id` (Users update own) OR `exists(select 1 from profiles where id = auth.uid() and role = 'admin')` (Admins update any).

## Authentication Flow

### Client
-   **Sign Up**: `/signup` -> `supabase.auth.signUp()`. Trigger creates profile.
-   **Sign In**: `/login` -> `supabase.auth.signInWithPassword()`.
-   **Session**: Persisted via local storage (handled by Supabase client).

### Admin
-   **Existing Flow**: `AdminLogin.jsx` currently signs in.
-   **Enhancement**: On login success, check `profiles` table. If `role !== 'admin'`, deny access and sign out.

## Frontend Architecture
-   **Context**: Introduce `AuthContext` (or use a hook `useAuth`) to provide `user`, `profile`, and `loading` states globally.
-   **Protected Routes**:
    -   `<ProtectedRoute role="admin">` for `/admin/*`.
    -   `<ProtectedRoute role="client">` for `/profile`.

## UI/UX
-   Reuse existing Tailwind components.
-   Consistent styling with `MainLayout`.
