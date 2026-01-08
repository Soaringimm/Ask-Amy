# Design: Consultation Data Model & Security

## Database Schema

### Table: `consultations`

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary Key |
| `created_at` | `timestamptz` | No | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update timestamp |
| `user_id` | `uuid` | Yes | `null` | FK to `auth.users`. Null for guests. |
| `name` | `text` | No | - | Applicant name |
| `email` | `text` | No | - | Applicant email |
| `question` | `text` | No | - | Consultation details |
| `deadline` | `date` | No | - | Requested deadline |
| `status` | `text` | No | `'pending'` | pending, quoted, paid, completed |
| `quote` | `text` | Yes | - | Admin provided quote |

## Security (RLS)

We need a hybrid policy model to support both authenticated users and anonymous guests.

1.  **Insert:**
    -   Public (Anonymous) access allowed.
    -   Authenticated access allowed.
    -   *Constraint:* `user_id` must match `auth.uid()` if provided.

2.  **Select:**
    -   **Admin:** Can view all rows.
    -   **User:** Can view rows where `user_id == auth.uid()`.
    -   **Guest:** Cannot list rows. (Might allow reading created row immediately after insert if needed, but usually confirmation page suffices).

3.  **Update:**
    -   **Admin:** Can update all rows (status, quote).
    -   **User:** Cannot update (except maybe cancel? Out of scope for now).

## Admin Access
Admin access is determined by a check against the `profiles` table where `role = 'admin'`, or a custom claim. For simplicity in RLS, we often use a helper function `is_admin()` or check the `profiles` table in the policy.
