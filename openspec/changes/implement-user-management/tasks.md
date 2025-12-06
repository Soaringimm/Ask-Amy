# Tasks: Implement User Management

## 1. Database Setup
-   [x] Create SQL migration for `public.profiles` table. <!-- id: db-profiles-table -->
-   [x] Create trigger for auto-profile creation on `auth.users` insert. <!-- id: db-profiles-trigger -->
-   [x] Configure RLS policies for `profiles`. <!-- id: db-profiles-rls -->

## 2. Shared Utilities
-   [x] Create `AuthContext` provider in `src/contexts/AuthContext.jsx`. <!-- id: fe-auth-context -->
-   [x] Implement `useAuth` hook. <!-- id: fe-use-auth -->
-   [x] Create `ProtectedRoute` component. <!-- id: fe-protected-route -->

## 3. Frontend Pages - Auth
-   [x] Create `src/pages/SignUp.jsx` (Form with Email, Password). <!-- id: fe-page-signup -->
-   [x] Create `src/pages/Login.jsx` (Form with Email, Password). <!-- id: fe-page-login -->
-   [x] Update `src/App.jsx` with new routes. <!-- id: fe-routes-auth -->

## 4. Frontend Pages - Profile
-   [x] Create `src/pages/ProfilePage.jsx` (View/Edit form). <!-- id: fe-page-profile -->
-   [x] Wire up Supabase `update` calls for profile data. <!-- id: fe-logic-profile -->

## 5. Frontend Pages - Admin
-   [x] Create `src/pages/AdminUsers.jsx`. <!-- id: fe-page-admin-users -->
-   [x] Add "Users" link to Admin Sidebar/Navigation. <!-- id: fe-admin-nav -->
    -   [x] Create `src/layouts/AdminLayout.jsx`.
    -   [x] Create `src/pages/AdminArticles.jsx` and move article management logic from `AdminDashboard`.
    -   [x] Refactor `AdminDashboard.jsx` to only handle consultations and use `AdminLayout`.
    -   [x] Refactor `AdminUsers.jsx` to use `AdminLayout`.
    -   [x] Update `src/App.jsx` with `/admin/articles` route.

## 6. Verification
-   [ ] Verify Sign Up creates Auth User + Profile Row. <!-- id: verify-signup -->
-   [ ] Verify Client Login works. <!-- id: verify-login -->
-   [ ] Verify RLS (Client cannot read other profiles). <!-- id: verify-rls -->
-   [x] Implement Admin role check in `AdminLogin.jsx`.