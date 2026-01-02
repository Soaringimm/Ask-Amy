# Tasks: Simplify MVP V2

## 1. Environment Variable Cleanup
- [ ] 1.1 Update `src/lib/supabase.js` to require env vars (no fallback)
- [ ] 1.2 Update `src/lib/ircc.js` to require env vars (no fallback)
- [ ] 1.3 Update `.env.example` with all required variables (including `VITE_CAL_USERNAME`)
- [ ] 1.4 Update `Dockerfile` to add `VITE_CAL_USERNAME` build arg
- [ ] 1.5 Update `docker-compose.yml` to pass `VITE_CAL_USERNAME`
- [ ] 1.6 Add startup validation to fail fast on missing env vars

## 2. Remove User Authentication
- [ ] 2.1 Delete `src/pages/Login.jsx`
- [ ] 2.2 Delete `src/pages/SignUp.jsx`
- [ ] 2.3 Delete `src/pages/ProfilePage.jsx`
- [ ] 2.4 Simplify `src/contexts/AuthContext.jsx` to admin-only auth
- [ ] 2.5 Update `src/components/ProtectedRoute.jsx` for admin-only
- [ ] 2.6 Remove client routes from `src/App.jsx` (`/login`, `/signup`, `/profile`)
- [ ] 2.7 Update `src/layouts/MainLayout.jsx` header (remove login/signup links)
- [ ] 2.8 Delete `src/pages/AdminUsers.jsx` (no user management)
- [ ] 2.9 Update `AdminLayout.jsx` sidebar (remove users link)

## 3. Cal.com Integration for Consultation
- [ ] 3.1 Install Cal.com embed package (`@calcom/embed-react`)
- [ ] 3.2 Update `ConsultationPage.jsx` to embed Cal.com inline calendar
- [ ] 3.3 Add `VITE_CAL_USERNAME` env var for Cal.com username
- [ ] 3.4 Style Cal.com embed to match site theme
- [ ] 3.5 Remove old form submission logic (Supabase consultations insert)

## 4. Blog System Enhancement
- [ ] 4.1 Create migration SQL: add `slug`, `excerpt`, `published_at` to `articles`
- [ ] 4.2 Create public articles listing page (`ArticlesPage.jsx`)
- [ ] 4.3 Create article detail page (`ArticleDetailPage.jsx`)
- [ ] 4.4 Update `AdminArticles.jsx` with slug, excerpt, publish workflow
- [ ] 4.5 Add routes `/articles` and `/articles/:slug` to `App.jsx`
- [ ] 4.6 Update `MainLayout.jsx` navigation (add articles link)

## 5. IRCC Language Detection
- [ ] 5.1 Add language detection utility function in `src/lib/ircc.js`
- [ ] 5.2 Update `searchQuestions()` to auto-detect and pass `lang` param
- [ ] 5.3 Update `getQuestionDetail()` to accept language parameter
- [ ] 5.4 Update `KnowledgeBasePage.jsx` to track and pass language context

## 6. Testing with Claude for Chrome
- [ ] 6.1 Test Cal.com booking flow
- [ ] 6.2 Test blog article listing and detail pages
- [ ] 6.3 Test IRCC search with Chinese input
- [ ] 6.4 Test IRCC search with English input
- [ ] 6.5 Test admin article management (create/edit/publish)

## 7. Cleanup
- [ ] 7.1 Remove unused imports and dead code
- [ ] 7.2 Update `openspec/project.md` with new architecture
- [ ] 7.3 Verify all routes work correctly
