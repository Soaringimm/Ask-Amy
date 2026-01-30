<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Server Operations

Production server credentials are stored in `.env`:
- `PROD_SERVER_HOST`: Server IP (192.168.1.98)
- `PROD_SERVER_USER`: SSH username
- `PROD_SERVER_PASSWORD`: SSH password

SSH command: `sshpass -p "$PROD_SERVER_PASSWORD" ssh $PROD_SERVER_USER@$PROD_SERVER_HOST`

### Deployment

Production directory: `/home/jacky/apps/Ask-Amy/`
Deploy: `cd /home/jacky/apps/Ask-Amy && git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d`

### Architecture

- ask-amy container uses Docker DNS resolver (127.0.0.11) for dynamic IP resolution
- Connected to both `local-network` and `immicore-network`
- Proxies `/api/help-centre/` to `immicore-search-service-1:3104`

## Database

### Connection

数据库运行在生产服务器上（不是本地），Supabase 配置可从 `~/immicore/.env` 获取：

- **PostgreSQL**: `postgresql://postgres:<password>@192.168.1.98:5432/postgres`
- **Supabase API**: `http://192.168.1.98:8002`

运行 SQL 迁移：
```bash
/opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -f supabase/sql/your_migration.sql
```

### Naming Conventions

- **所有表必须使用 `aa_` 前缀**（如 `aa_profiles`, `aa_articles`, `aa_feedback`）
- 这是为了在共享的 Supabase 实例中区分 Ask-Amy 项目的表
- Storage bucket 也使用 `aa_` 前缀（如 `aa_feedback_images`）