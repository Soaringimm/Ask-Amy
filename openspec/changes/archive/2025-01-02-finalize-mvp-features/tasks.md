# Tasks: Finalize MVP Features

## 1. Database Schema
-   [x] Create `supabase/sql/create_consultations_table.sql` with table definition and RLS. <!-- id: db-consultations -->
-   [x] Create `supabase/sql/create_articles_table.sql` with table definition and RLS. <!-- id: db-articles -->

## 2. UI Navigation
-   [x] Update `src/layouts/MainLayout.jsx` to include `useAuth` hook. <!-- id: ui-nav-auth -->
-   [x] Add conditional rendering for Login/Signup vs Profile/Logout in Header. <!-- id: ui-nav-links -->

## 3. Consultation Logic
-   [x] Update `src/pages/ConsultationPage.jsx` to get `user` from `useAuth`. <!-- id: logic-consultation-user -->
-   [x] Include `user_id` in the insert payload if user is logged in. <!-- id: logic-consultation-insert -->
