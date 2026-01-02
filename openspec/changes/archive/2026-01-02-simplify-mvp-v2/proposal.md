# Change: Simplify MVP V2

## Why
Current implementation has unnecessary complexity: user authentication system that isn't needed, hardcoded secrets, and a consultation flow that doesn't match the business model (calendar-based slot booking).

## What Changes

### 1. Remove User Authentication System **BREAKING**
- Delete `/login`, `/signup`, `/profile` pages and routes
- Remove `AuthContext`, `ProtectedRoute` (except for admin)
- Remove `profiles` table dependency for clients
- Consultation becomes pure guest mode

### 2. Cal.com Integration for Consultation Booking
- Replace free-form deadline input with Cal.com embed widget
- Admin manages availability in Cal.com dashboard (external)
- Guest books directly through embedded Cal.com calendar
- No custom `consultation_slots` table needed
- Admin Dashboard shows booking list via Cal.com API

### 3. Blog System for Knowledge Base
- Enhance `articles` table with `slug`, `excerpt`, `published_at`
- Articles are Chinese-only (as specified)
- Public listing page for published articles
- Admin CRUD with publish/unpublish workflow
- Content rendered with react-markdown (already in project)
- Image upload to Supabase Storage with inline insertion to Markdown

### 4. IRCC API Language Detection
- Detect input language (Chinese vs English)
- Pass corresponding `lang` parameter to API
- Chinese input → Chinese results, English input → English results

### 5. Environment Variable Cleanup
- Remove hardcoded Supabase URL/Key from `supabase.js`
- Remove hardcoded IRCC API Key from `ircc.js`
- Add `VITE_CAL_USERNAME` for Cal.com embed
- Add `VITE_CAL_API_KEY` for Cal.com API (admin booking list)
- Update `.env.example` with all required variables
- Fail fast if required env vars missing

### 6. Payment Flow (No Change)
- Keep existing WeChat/Alipay QR code modal
- No Stripe integration

## Impact
- Affected specs: `search` (language detection)
- New specs: `consultation`, `blog`
- Deleted code: `Login.jsx`, `SignUp.jsx`, `ProfilePage.jsx`, `AuthContext.jsx` (simplified), `AdminUsers.jsx`
- Modified: `ConsultationPage.jsx`, `KnowledgeBasePage.jsx`, `AdminArticles.jsx`, `MainLayout.jsx`, `App.jsx`
- Database: Modified `articles` table only
- External: Cal.com account required
