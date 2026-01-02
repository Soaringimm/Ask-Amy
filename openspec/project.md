# Project Context

## Purpose
**Ask Amy (Ask Amy 咨询平台)** is a consultancy platform for immigration advice. It serves:
1. **Visitors (Guests):** Browse knowledge base, search IRCC Q&A, read articles, and book consultations via Cal.com. No login required.
2. **Admin (Amy):** Dashboard to manage articles, view Cal.com bookings, and manage content.

## Tech Stack
- **Frontend:** React 19, React Router v7, Tailwind CSS, Vite 7.
- **Backend:** Supabase (PostgreSQL, Auth for admin, Storage for images).
- **Booking:** Cal.com (embedded calendar, API for admin booking list).
- **Language:** JavaScript (ES Modules).
- **Deployment:** Docker (self-hosted on ~/local infrastructure).
- **Key Libraries:** `date-fns`, `react-icons`, `@supabase/supabase-js`, `@calcom/embed-react`, `react-markdown`.

## Project Conventions

### Code Style
- **Formatting:** Standard JavaScript/React formatting.
- **Styling:** Tailwind CSS utility classes directly in JSX.
- **Components:** Functional components with hooks.
- **Naming:** PascalCase for components (`HomePage.jsx`), camelCase for functions/variables.
- **File Structure:**
    - `src/pages/`: Top-level route components.
    - `src/layouts/`: Layout wrappers (`MainLayout.jsx`, `AdminLayout.jsx`).
    - `src/lib/`: Shared utilities (`supabase.js`, `ircc.js`, `calcom.js`, `storage.js`).

### Database Conventions
- **Table Prefix:** All tables use `aa_` prefix (Ask Amy).
- **Tables:** `aa_profiles`, `aa_articles`.
- **Storage Buckets:** `aa_article_images`.
- **Naming:** snake_case for all database objects.

### Architecture Patterns
- **SPA (Single Page Application):** Client-side routing with React Router.
- **BaaS (Backend-as-a-Service):** Supabase for database, admin auth, and storage.
- **Guest-First:** Public visitors don't need accounts; admin-only authentication.
- **External Services:** Cal.com for booking, IRCC API for Q&A search.

### Testing Strategy
- **Manual Testing:** Claude for Chrome for frontend flow verification.
- **Linting:** ESLint for code quality.

### Git Workflow
- **Main Branch:** `main`.
- **Feature Branch:** `jacky`.
- **Deployment:** Docker build on self-hosted infrastructure.

## Domain Context
- **Consultation:** Handled entirely by Cal.com (15min/30min meetings). Payment via WeChat/Alipay QR codes post-consultation.
- **Knowledge Base:** Articles (Markdown with images) and IRCC Q&A search.
- **IRCC API:** Auto-detects language (Chinese input → Chinese results, English input → English results).

## Important Constraints
- **Authentication:** Admin-only (no client registration/login).
- **Privacy:** RLS policies protect data; public can only see published articles.
- **Payment:** Manual (WeChat/Alipay QR codes sent after booking).

## External Dependencies
- **Supabase:** Database, admin auth, storage.
- **Cal.com:** Booking calendar and API.
- **IRCC Help Centre API:** Q&A search (`imm_help.jackyzhang.app`).
