# Tasks: Connect Consultation to Supabase

## Database Setup
- [ ] Create `supabase/sql/create_consultations_table.sql` defining the `consultations` table and RLS policies. <!-- id: create-sql -->
- [ ] Apply the SQL migration to the local/remote Supabase instance (manual step or via script). <!-- id: apply-sql -->

## Frontend Integration
- [ ] Update `src/pages/ConsultationPage.jsx` to import `useAuth`. <!-- id: update-page-import -->
- [ ] Modify `ConsultationPage.jsx` to pre-fill state from `user`/`profile` when available. <!-- id: prefill-form -->
- [ ] Update `handleSubmit` in `ConsultationPage.jsx` to include `user_id` in the Supabase insert payload. <!-- id: submit-logic -->
- [ ] Verify `AdminDashboard.jsx` works with the new table structure (should be compatible as-is, but verify). <!-- id: verify-admin -->
