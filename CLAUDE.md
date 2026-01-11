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