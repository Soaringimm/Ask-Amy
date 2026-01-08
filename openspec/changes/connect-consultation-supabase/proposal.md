# Proposal: Connect Consultation to Supabase

## Problem
Currently, the consultation booking feature in the frontend (`ConsultationPage.jsx`) attempts to interact with a `consultations` table in Supabase, but this table does not exist. Furthermore, logged-in users are treated as guests—they must manually re-enter their details, and their bookings are not linked to their user accounts.

## Solution
1.  **Database:** Create the `consultations` table with necessary fields and Row Level Security (RLS) policies to allow guest submissions while protecting user privacy.
2.  **Frontend:** Update `ConsultationPage.jsx` to leverage `AuthContext`.
    -   Pre-fill form fields for logged-in users.
    -   Attach `user_id` to the consultation record upon submission.

## Impact
-   **Users:** Improved UX for logged-in users (no re-typing). Bookings are now trackable.
-   **Admins:** Can distinguish between guest and member requests.
-   **Security:** Data is properly secured via RLS instead of relying on client-side logic.
