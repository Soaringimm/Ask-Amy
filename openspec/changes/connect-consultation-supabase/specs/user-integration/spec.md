# Spec: Frontend User Integration

## MODIFIED Requirements

### Requirement: Consultation Form Pre-filling
The consultation form MUST automatically populate known user information to reduce friction.

#### Scenario: Logged-in User
-   **Given** a user is logged in
-   **And** their profile contains a `display_name` and `email`
-   **When** they navigate to the Consultation Page
-   **Then** the Name and Email fields are pre-filled with their profile data.

### Requirement: Link Consultation to User
Consultations submitted by logged-in users MUST be associated with their account.

#### Scenario: Submission with User ID
-   **Given** a user is logged in
-   **When** they submit the consultation form
-   **Then** the payload sent to Supabase includes their `user_id`.

### Requirement: Guest Fallback
The system MUST continue to support guest submissions.

#### Scenario: Guest Submission
-   **Given** a user is NOT logged in
-   **When** they submit the consultation form
-   **Then** the payload sent to Supabase has `user_id` as null.
