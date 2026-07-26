#!/bin/bash
set -e

echo "🚀 Starting Ask-Amy deployment..."

# Server 69 is the only deployment target. The legacy 98 runner must never run
# this script; the workflow label contract enforces that boundary.
cd /Users/jacky/apps/ask-amy
export DOCKER_CONTEXT="${DOCKER_CONTEXT:-colima-platform-production}"

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Build and update containers (rolling update)
echo "🐳 Building containers..."
docker compose -f docker-compose.prod.yml build

echo "🔄 Updating containers (rolling update)..."
docker compose -f docker-compose.prod.yml up -d

# Show container status
echo "✅ Deployment complete!"
docker ps | grep ask-amy
