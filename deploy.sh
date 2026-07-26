#!/bin/bash
set -e

echo "🚀 Starting Ask-Amy deployment..."

# Server 69 is the only deployment target. The legacy 98 runner must never run
# this script; the workflow label contract enforces that boundary.
cd /Users/jacky/apps/ask-amy
export DOCKER_CONTEXT="${DOCKER_CONTEXT:-colima-platform-production}"

# Ensure we're on main branch
echo "🔀 Switching to main branch..."
git checkout main

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Build and update containers (rolling update)
# ask-amy is built with --no-cache to ensure the React bundle always includes
# the latest source changes (Docker layer caching can persist stale builds).
# meet-signal uses cache since it changes less frequently.
echo "🐳 Building ask-amy (no cache)..."
docker compose -f docker-compose.prod.yml build --no-cache ask-amy
echo "🐳 Building meet-signal..."
docker compose -f docker-compose.prod.yml build meet-signal

echo "🔄 Updating containers (rolling update)..."
docker compose -f docker-compose.prod.yml up -d

# Show container status
echo "✅ Deployment complete!"
docker ps | grep ask-amy
