# Spec: Admin User Management

## ADDED Requirements

### Requirement: List Users
Admins MUST be able to view a list of all registered users.

#### Scenario: Admin Views User List
-   Given an authenticated Admin
-   When they navigate to `/admin/users`
-   Then they see a table of users with Email, Name, Role, and Created Date.

### Requirement: User Role Management
Admins MUST be able to see the role of a user.

#### Scenario: View User Role
-   In the user list table, the Role column displays 'client' or 'admin'.
