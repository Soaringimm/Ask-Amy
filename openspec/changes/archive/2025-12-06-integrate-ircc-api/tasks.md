## 1. Configuration
- [x] 1.1 Add `VITE_IRCC_API_KEY` and `VITE_IRCC_API_URL` to `.env`.
- [x] 1.2 Update `project.md` to reflect new dependency.

## 2. Service Layer
- [x] 2.1 Create `src/lib/ircc.js` service module.
- [x] 2.2 Implement `searchQuestions(query)` using `fetch`.
- [x] 2.3 Implement `getQuestionDetail(qnum)` using `fetch`.
- [x] 2.4 Add error handling (401, 404).

## 3. UI Implementation
- [x] 3.1 Refactor `KnowledgeBasePage.jsx`.
- [x] 3.2 Replace static list with `SearchResults` component.
- [x] 3.3 Add `DebouncedInput` for search box.
- [x] 3.4 Implement "Article Detail" modal or view using `react-markdown` (need to install).
- [x] 3.5 Install `react-markdown` (`npm install react-markdown`).

## 4. Testing
- [x] 4.1 Verify search returns results for "study permit".
- [x] 4.2 Verify detail view renders Markdown correctly.
