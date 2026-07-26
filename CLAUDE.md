# CLAUDE.md — Git Workflow Rules

## 🔀 必须遵守的 Git 规则

**禁止：**
- ❌ 直接 push 到 `main` 或 `dev`
- ❌ 在主 repo 目录里直接开发
- ❌ `git push --force` 到任何共享分支

**开发流程（Worktree Workflow）：**

```bash
# 1. 进入项目主 repo
cd <project-root>

# 2. 拉取最新
git fetch origin

# 3. 从 origin/dev 创建 worktree
git worktree add ../<project>-<feature> origin/dev

# 4. 进入 worktree，创建 feature branch
cd ../<project>-<feature>
git checkout -b feature/<feature>

# 5. 开发、commit
git add . && git commit -m "feat: description"

# 6. Push + 创建 PR
git push origin feature/<feature>
gh pr create --base dev --title "feat: xxx" --body "..."

# 7. 完成后清理
cd <project-root>
git worktree remove ../<project>-<feature>
```

**关键：**
- 永远从 `origin/dev` 创建 worktree，不用本地 `dev`
- 创建前必须 `git fetch origin`
- Worktree 命名：`<project>-<feature-name>`
- PR merge 后必须清理 worktree

---

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
- `PROD_SERVER_HOST`: Current server IP (192.168.1.69)
- `PROD_SERVER_USER`: SSH username
- `PROD_SERVER_PASSWORD`: SSH password

Production mutations are confirmation-gated and use the governed 69 deployment lane. Server 98 is
legacy residual cleanup-only; never deploy, validate, run CI, or use a database there.

### Deployment

Production checkout: `/Users/jacky/apps/ask-amy` on server 69. Use the repository's current 69-owned
deployment workflow; do not revive the old direct 98 deploy command.

### Architecture

- ask-amy container uses Docker DNS resolver (127.0.0.11) for dynamic IP resolution
- Connected to both `local-network` and `immicore-network`
- Proxies `/api/help-centre/` to `immicore-search-service-1:3104`

## Database

### Connection

数据库运行在生产服务器上（不是本地），Supabase 配置可从 `~/immicore/.env` 获取：

- **PostgreSQL**: current governed DSN on server 69 (resolve from the owner-managed runtime env; never hardcode a password)
- **Supabase API (公网)**: `https://supabase.jackyzhang.app`
- **Supabase API (内网)**: `http://192.168.1.69:8003`

前端应使用公网 URL 以确保验证邮件和密码重置链接正常工作。

运行 SQL 迁移：
```bash
/opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -f supabase/sql/your_migration.sql
```

### Naming Conventions

- **所有表必须使用 `aa_` 前缀**（如 `aa_profiles`, `aa_articles`, `aa_feedback`）
- 这是为了在共享的 Supabase 实例中区分 Ask-Amy 项目的表
- Storage bucket 也使用 `aa_` 前缀（如 `aa_feedback_images`）
