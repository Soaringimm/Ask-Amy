#!/bin/bash
set -e

echo "🧪 Starting Ask-Amy TEST deployment..."

# Navigate to project directory
cd /home/jacky/apps/Ask-Amy

# Ensure we're on dev branch
echo "🔀 Switching to dev branch..."
git checkout dev

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin dev

# Build and update test containers
echo "🐳 Building test containers..."
docker compose -f docker-compose.test.yml build

echo "🔄 Updating test containers..."
docker compose -f docker-compose.test.yml up -d

# Show container status
echo "✅ Test deployment complete!"
docker ps | grep ask-amy-test
