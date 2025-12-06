# Proposal: User Management System

## Background
Currently, "Ask Amy" operates with a Guest-only flow for clients and a single Admin flow. Clients cannot track their consultation history or save their details for future requests. The Admin dashboard lacks a dedicated view for managing the user base.

## Goal
Implement a comprehensive User Management system that allows:
1.  **Clients** to register, log in, and manage their profiles.
2.  **Admins** to view and manage registered users.
3.  **System** to securely distinguish between 'admin' and 'client' roles via Supabase.

## Scope
-   **Authentication**: Sign Up, Sign In, Sign Out pages for Clients.
-   **Profile**: User profile management (Avatar, Display Name, WeChat ID).
-   **Admin**: User list view in Admin Dashboard.
-   **Infrastructure**: `profiles` table in Supabase with RLS policies and triggers.

## Key Changes
-   New Route: `/login` (Client Login), `/signup` (Client Registration), `/profile` (Client Profile).
-   Updated Route: `/admin/users` (New Admin Page).
-   Database: Add `public.profiles` table linked to `auth.users`.
-   Security: RLS policies to ensure users can only edit their own profiles, and admins can view all.

## Risks
-   **Migration**: Existing "Guest" consultations are not linked to users. (Out of scope for this iteration: retroactive linking).
-   **Security**: ensuring the existing Admin Login remains secure and distinct from Client Login.
