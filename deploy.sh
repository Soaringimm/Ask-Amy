#!/bin/bash
set -e

echo "🚀 Starting Ask-Amy deployment..."

# Navigate to project directory
cd /home/jacky/apps/Ask-Amy

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Rebuild and restart Docker container
echo "🐳 Rebuilding Docker container..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Show container status
echo "✅ Deployment complete!"
docker ps | grep ask-amy
