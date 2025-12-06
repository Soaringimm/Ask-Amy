# Change: Integrate IRCC Help Centre API

## Why
The current Knowledge Base relies on static local JSON data (`sample-articles.json`), which is limited in scope and requires manual updates. A new **IRCC Help Centre API** (`imm_help.jackyzhang.app`) is now available, offering real-time search, multi-language support (auto-translation), and a vast database of official questions and answers.

## What Changes
- **Search Logic:** Replace local filtering with a call to `GET /search`.
- **Article Detail:** Replace local lookup with `GET /question/{id}`.
- **Frontend:** Update `KnowledgeBasePage.jsx` to fetch data asynchronously.
- **Data Model:** Adopt the API's response structure (`qnum`, `title`, `snippet`, `content` in Markdown).
- **Security:** Securely handle the `X-API-Key`.

## Impact
- **Affected Specs:** `search` capability.
- **Affected Code:**
    - `src/pages/KnowledgeBasePage.jsx` (major refactor).
    - `src/lib/api.js` (new file for API wrapper).
    - `.env` (new `VITE_IRCC_API_KEY`).
