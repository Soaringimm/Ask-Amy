#!/bin/bash
# Setup script for Ask Amy systemd service

echo "Setting up Ask Amy systemd service..."

# Copy service file
sudo cp /home/jacky/apps/Ask-Amy/ask-amy.service /etc/systemd/system/ || { echo "Failed to copy service file"; exit 1; }

# Reload systemd
sudo systemctl daemon-reload || { echo "Failed to reload systemd"; exit 1; }

# Enable service
sudo systemctl enable ask-amy.service || { echo "Failed to enable service"; exit 1; }

# Start service
sudo systemctl start ask-amy.service || { echo "Failed to start service"; exit 1; }

# Show status
echo ""
echo "Service status:"
sudo systemctl status ask-amy.service --no-pager

echo ""
echo "Container status:"
docker ps | grep ask-amy

echo ""
echo "To view logs: sudo journalctl -u ask-amy.service -f"
echo "To stop: sudo systemctl stop ask-amy.service"
echo "To restart: sudo systemctl restart ask-amy.service"
