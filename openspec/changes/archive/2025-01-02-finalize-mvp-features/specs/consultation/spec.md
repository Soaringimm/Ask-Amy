## ADDED Requirements

#### Scenario: Guest submits consultation
-   **Given** a guest user on `/consultation`
-   **When** they fill the form and submit
-   **Then** a new row is created in `consultations` table
-   **And** `user_id` is NULL
-   **And** `status` is 'pending'

#### Scenario: Authenticated User submits consultation
-   **Given** a logged-in user on `/consultation`
-   **When** they fill the form and submit
-   **Then** a new row is created in `consultations` table
-   **And** `user_id` matches their auth ID
