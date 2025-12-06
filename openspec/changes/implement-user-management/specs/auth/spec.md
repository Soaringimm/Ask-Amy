# Spec: Authentication

## ADDED Requirements

### Requirement: Client Registration
The system MUST allow new clients to create an account using email and password.

#### Scenario: Successful Registration
-   Given a visitor is on the `/signup` page
-   When they enter a valid email and strong password
-   And click "Create Account"
-   Then a new user is created in `auth.users`
-   And they are redirected to the dashboard/home page logged in.

### Requirement: Client Login
The system MUST allow existing clients to sign in.

#### Scenario: Successful Login
-   Given a visitor is on the `/login` page
-   When they enter valid credentials
-   And click "Sign In"
-   Then they are authenticated and redirected.

### Requirement: Access Control
The system MUST restrict access to protected pages based on authentication status.

#### Scenario: Unauthenticated Access
-   Given an unauthenticated visitor
-   When they attempt to access `/profile`
-   Then they are redirected to `/login`.
