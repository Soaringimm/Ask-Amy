# Spec: Database Schema for Consultations

## ADDED Requirements

### Requirement: Create Consultations Table
The system MUST persist consultation requests in a Postgres table accessible via Supabase client.

#### Scenario: Table Structure
-   **Given** the database is initialized
-   **When** the schema script is run
-   **Then** a `consultations` table exists with columns: `id`, `created_at`, `user_id`, `name`, `email`, `question`, `deadline`, `status`, `quote`.
-   **And** `status` defaults to `'pending'`.
-   **And** `user_id` is a foreign key to `auth.users`.

### Requirement: Row Level Security (RLS)
Access to consultation data MUST be restricted based on authentication status and user role.

#### Scenario: Guest Submission
-   **Given** an unauthenticated user (guest)
-   **When** they attempt to insert a record into `consultations`
-   **Then** the operation succeeds.

#### Scenario: User Submission
-   **Given** an authenticated user
-   **When** they attempt to insert a record with their own `user_id`
-   **Then** the operation succeeds.

#### Scenario: User Access
-   **Given** an authenticated user
-   **When** they query `consultations`
-   **Then** they only see records where `user_id` matches their own ID.

#### Scenario: Admin Access
-   **Given** an admin user
-   **When** they query `consultations`
-   **Then** they see all records.
