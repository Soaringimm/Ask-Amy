## Context
Ask Amy is being simplified from a user-authenticated platform to a guest-only consultation booking system with Cal.com integration.

## Goals
- Remove unnecessary user authentication complexity
- Use Cal.com for consultation booking (no custom calendar)
- Add public blog functionality for Chinese articles
- Auto-detect language for IRCC search
- Clean up hardcoded secrets

## Non-Goals
- Stripe payment integration (keep WeChat/Alipay QR)
- Multi-tenant support
- User accounts for clients
- Custom calendar/slot management

## Decisions

### 1. Cal.com Integration
Use `@calcom/embed-react` to embed Cal.com calendar directly in ConsultationPage.

```jsx
import Cal from "@calcom/embed-react";

<Cal calLink="username/event-type" />
```

Benefits:
- No database schema for slots
- Admin manages availability in Cal.com dashboard
- Built-in email notifications
- Free tier sufficient for MVP

Env var: `VITE_CAL_USERNAME`

### 2. Database Schema Changes

**Modified table: `articles`**
```sql
alter table public.articles add column slug text unique;
alter table public.articles add column excerpt text;
alter table public.articles add column published_at timestamptz;
-- Create index for slug lookup
create index articles_slug_idx on public.articles(slug);
```

No changes to `consultations` table (Cal.com handles booking data).

### 3. Language Detection Strategy
Simple heuristic: if input contains any Chinese character (Unicode range `\u4e00-\u9fff`), treat as Chinese; otherwise English.

```javascript
function detectLanguage(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  return hasChinese ? 'zh' : 'en';
}
```

### 4. Auth Context Simplification
Keep `AuthContext` but only for admin authentication. Remove all client-side auth state.

### 5. Routing Changes
| Remove | Add |
|--------|-----|
| `/login` | `/articles` |
| `/signup` | `/articles/:slug` |
| `/profile` | |
| `/admin/users` | |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Cal.com free tier limits | Sufficient for MVP; upgrade if needed |
| No booking data in our DB | Can add Cal.com webhook later if needed |
| Existing consultations table unused | Keep for historical data; don't delete |

## Migration Plan
1. Run articles table migration (additive)
2. Set up Cal.com account and event type
3. Add `VITE_CAL_USERNAME` to `.env` and rebuild Docker image
4. Deploy: `docker-compose up -d --build`
5. Delete unused files post-deploy

## Docker Deployment
Env vars are baked into Vite bundle at build time. Update `Dockerfile` and `docker-compose.yml`:

```dockerfile
# Dockerfile - add build arg
ARG VITE_CAL_USERNAME
ENV VITE_CAL_USERNAME=$VITE_CAL_USERNAME
```

```yaml
# docker-compose.yml - add arg
build:
  args:
    VITE_CAL_USERNAME: ${VITE_CAL_USERNAME}
```

## Open Questions
None - all clarified with user.
