# Project Context

## Purpose
**Ask Amy (Ask Amy 咨询平台)** is a consultancy platform built for knowledge monetization. It serves two main audiences:
1.  **Clients:** Can browse a knowledge base of professional advice (likely immigration/IRCC related), make voluntary tips via WeChat/Alipay, and request personalized consultations. Clients can register/login to track their requests and manage their profile, or (optionally) submit as guests.
2.  **Admin (Amy):** A dashboard to manage consultation requests, provide quotes, update request status, and manage knowledge base articles.

## Tech Stack
- **Frontend:** React 19, React Router v7, Tailwind CSS, Vite 7.
- **Backend:** Supabase (PostgreSQL, Auth, Storage).
- **Language:** JavaScript (ES Modules).
- **Deployment:** Vercel (primary), Cloudflare Pages (secondary/configured).
- **Key Libraries:** `date-fns` (dates), `react-icons` (icons), `@supabase/supabase-js`.

## Project Conventions

### Code Style
- **Formatting:** Standard JavaScript/React formatting.
- **Styling:** Tailwind CSS utility classes directly in JSX.
- **Components:** Functional components with hooks. Located in `src/components`, `src/pages`, `src/layouts`.
- **Naming:** PascalCase for components (`HomePage.jsx`), camelCase for functions/variables.
- **File Structure:**
    - `src/pages/`: Top-level route components.
    - `src/layouts/`: Layout wrappers (e.g., `MainLayout.jsx`).
    - `src/lib/`: Shared utilities (e.g., `supabase.js`).

### Architecture Patterns
- **SPA (Single Page Application):** Client-side routing with React Router.
- **BaaS (Backend-as-a-Service):** Heavy reliance on Supabase for database, authentication, and RLS (Row Level Security).
- **Direct Database Access:** Client-side Supabase calls from components/pages.

### Testing Strategy
- **Manual Testing:** Current strategy involves verifying frontend flows (submission, login) and backend data reflection in Supabase.
- **Future:** No automated testing framework (Jest/Vitest) is currently set up in `package.json` scripts, though `eslint` is present for linting.

### Git Workflow
- **Main Branch:** `main`.
- **Deployment:** Automatic deployment to Vercel/Cloudflare on push to `main`.
- **Conventions:** Standard semantic commits (implied).

## Domain Context
- **Consultancy:** The core business object is a "Consultation" which goes through states (Pending -> Quoted -> Paid/Completed).
- **Knowledge Base:** "Articles" are the content unit, viewable by public, manageable by admin.
- **Payment:** Currently manual (QR codes for WeChat/Alipay), with future plans for Stripe (CAD).
- **IRCC:** "Immigration, Refugees and Citizenship Canada" - likely the domain of expertise based on data files (`ircc-topics-list.json`).

## Important Constraints
- **Authentication:** Dual authentication model (Admin & Client).
- **Privacy:** RLS policies must strictly protect consultation data. Clients see only their own; Admins see all.
- **Localization:** Current content is mix of Chinese (primary for UI/Docs) and potentially English (IRCC content). Future plan for multi-language.

## External Dependencies
- **Supabase:** Critical dependency for all data and auth.
- **Vercel/Cloudflare:** Hosting providers.
- **IRCC Help Centre API:** Provides real-time Q&A search and content (imm_help.jackyzhang.app).