# Tasks: Simplify MVP V2

## 1. Environment Variable Cleanup
- [x] 1.1 Update `src/lib/supabase.js` to require env vars (no fallback)
- [x] 1.2 Update `src/lib/ircc.js` to require env vars (no fallback)
- [x] 1.3 Update `.env.example` with all required variables (including `VITE_CAL_USERNAME`)
- [x] 1.4 Update `Dockerfile` to add `VITE_CAL_USERNAME` and `VITE_CAL_API_KEY` build args
- [x] 1.5 Update `docker-compose.yml` to pass `VITE_CAL_USERNAME` and `VITE_CAL_API_KEY`
- [x] 1.6 Add startup validation to fail fast on missing env vars

## 2. Remove User Authentication
- [x] 2.1 Delete `src/pages/Login.jsx`
- [x] 2.2 Delete `src/pages/SignUp.jsx`
- [x] 2.3 Delete `src/pages/ProfilePage.jsx`
- [x] 2.4 Simplify `src/contexts/AuthContext.jsx` to admin-only auth
- [x] 2.5 Update `src/components/ProtectedRoute.jsx` for admin-only
- [x] 2.6 Remove client routes from `src/App.jsx` (`/login`, `/signup`, `/profile`)
- [x] 2.7 Update `src/layouts/MainLayout.jsx` header (remove login/signup links)
- [x] 2.8 Delete `src/pages/AdminUsers.jsx` (no user management)
- [x] 2.9 Update `AdminLayout.jsx` sidebar (remove users link)

## 3. Cal.com Integration for Consultation
- [x] 3.1 Install Cal.com embed package (`@calcom/embed-react`)
- [x] 3.2 Update `ConsultationPage.jsx` to embed Cal.com inline calendar
- [x] 3.3 Add `VITE_CAL_USERNAME` and `VITE_CAL_API_KEY` env vars
- [x] 3.4 Style Cal.com embed to match site theme
- [x] 3.5 Remove old form submission logic (Supabase consultations insert)
- [x] 3.6 Create Cal.com API utility in `src/lib/calcom.js`
- [x] 3.7 Update `AdminDashboard.jsx` to show booking list from Cal.com API

## 4. Blog System Enhancement
- [x] 4.1 Create migration SQL: add `slug`, `excerpt`, `published_at` to `articles`
- [x] 4.2 Create Supabase Storage bucket `article-images` with public access policy
- [x] 4.3 Create image upload utility in `src/lib/storage.js`
- [x] 4.4 Create public articles listing page (`ArticlesPage.jsx`)
- [x] 4.5 Create article detail page (`ArticleDetailPage.jsx`)
- [x] 4.6 Update `AdminArticles.jsx` with slug, excerpt, publish workflow, image upload button
- [x] 4.7 Add routes `/articles` and `/articles/:slug` to `App.jsx`
- [x] 4.8 Update `MainLayout.jsx` navigation (add articles link)

## 5. IRCC Language Detection
- [x] 5.1 Add language detection utility function in `src/lib/ircc.js`
- [x] 5.2 Update `searchQuestions()` to auto-detect and pass `lang` param
- [x] 5.3 Update `getQuestionDetail()` to accept language parameter
- [x] 5.4 Update `KnowledgeBasePage.jsx` to track and pass language context

## 6. Testing with Claude for Chrome
- [ ] 6.1 Test Cal.com booking flow
- [ ] 6.2 Test blog article listing and detail pages
- [ ] 6.3 Test IRCC search with Chinese input
- [ ] 6.4 Test IRCC search with English input
- [ ] 6.5 Test admin article management (create/edit/publish)

## 7. Cleanup
- [x] 7.1 Remove unused imports and dead code
- [ ] 7.2 Update `openspec/project.md` with new architecture
- [x] 7.3 Verify all routes work correctly (build passed)
