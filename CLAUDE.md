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
- `PROD_SERVER_HOST`: Server IP
- `PROD_SERVER_USER`: SSH username
- `PROD_SERVER_PASSWORD`: SSH password

SSH command: `sshpass -p "$PROD_SERVER_PASSWORD" ssh $PROD_SERVER_USER@$PROD_SERVER_HOST`

### Common Issues

**502 Bad Gateway on /api/help-centre/search**:
- Cause: search-service restart causes IP change, nginx DNS cache stale
- Fix: `docker restart ask-amy`