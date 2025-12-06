# Spec: User Profile

## ADDED Requirements

### Requirement: View Profile
Authenticated users MUST be able to view their profile details.

#### Scenario: View Own Profile
-   Given an authenticated user
-   When they navigate to `/profile`
-   Then they see their Email, Display Name, and WeChat ID.

### Requirement: Update Profile
Authenticated users MUST be able to update their profile details.

#### Scenario: Update WeChat ID
-   Given an authenticated user on `/profile`
-   When they change their WeChat ID field
-   And save
-   Then the database is updated and the UI reflects the change.
