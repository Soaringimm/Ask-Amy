# Proposal: Finalize MVP Features (Auth & Consultation)

## Background
While basic Auth pages (`Login`, `SignUp`) exist, they are not accessible from the main navigation. Additionally, the Consultation form submits data to Supabase, but the underlying `consultations` table and RLS policies are missing, causing submissions to fail.

## Goal
1.  **Integrate Auth:** Make Login/Signup accessible in the UI header.
2.  **Enable Consultation Booking:** Ensure the database schema exists and secure RLS policies are in place to allow both Guest and User submissions.

## Key Changes
-   **Database:** Add `consultations` table and RLS policies.
-   **UI:** Update `MainLayout` to show User state (Avatar/Name) or Guest state (Login/Signup).
-   **Logic:** Enhance `ConsultationPage` to associate bookings with logged-in users automatically.

## Risks
-   None significant. Standard feature completion.
