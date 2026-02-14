#!/bin/bash
set -e

echo "🚀 Starting Ask-Amy deployment..."

# Navigate to project directory
cd /home/jacky/apps/Ask-Amy

# Ensure we're on main branch
echo "🔀 Switching to main branch..."
git checkout main

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
