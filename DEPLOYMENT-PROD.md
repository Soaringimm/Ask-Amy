# Ask Amy - Production Deployment Guide

**Deployment Date:** 2026-01-04
**Application URL:** http://localhost:8507
**Server Location:** /home/jacky/apps/Ask-Amy

## Application Overview

Ask Amy is a frontend Vite application served via Nginx:
- **Build Tool:** Vite
- **Web Server:** Nginx (alpine)
- **Port:** 8507 → 80 (container)
- **Network:** local-network (external)

## Deployment Status

### ✅ Completed Configuration

1. **Production Docker Compose** (`docker-compose.prod.yml`)
   - Container name: `ask-amy-production`
   - Health checks enabled (30s interval)
   - Log rotation: 3 files × 10MB max
   - Resource limits: 512MB RAM, 1 CPU core
   - Restart policy: `unless-stopped`

2. **Systemd Service** (`ask-amy.service`)
   - Auto-start on boot
   - Auto-restart on failure
   - Systemd journal logging

3. **Setup Script** (`setup-systemd.sh`)
   - One-command service installation
   - Automatic service enable and start

## Environment Variables

The application uses environment variables from `.env`:

### Build-Time Variables (Vite)
```bash
VITE_SUPABASE_URL=https://supabase.jackyzhang.app
VITE_SUPABASE_ANON_KEY=<jwt-token>
VITE_CAL_USERNAME=amyxing
VITE_CAL_API_KEY=<cal-api-key>
```

### Runtime Variables (Nginx)
```bash
SEARCH_SERVICE_TOKEN=<token>
```

**Note:** `.env` file is git-ignored for security

## Deployment Steps

### Initial Setup

1. **Ensure `.env` file exists with proper values**
   ```bash
   cd /home/jacky/apps/Ask-Amy
   ls -la .env  # Should exist with 600 permissions
   ```

2. **Build and start with production config**
   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **Install systemd service (optional but recommended)**
   ```bash
   ./setup-systemd.sh
   ```

### Manual Deployment (Without Systemd)

```bash
cd /home/jacky/apps/Ask-Amy

# Stop current container
docker compose -f docker-compose.prod.yml down

# Rebuild (if code changed)
docker compose -f docker-compose.prod.yml build --no-cache

# Start container
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps | grep ask-amy
curl http://localhost:8507
```

## Service Management

### Using Systemd (After Running setup-systemd.sh)

```bash
# Start service
sudo systemctl start ask-amy.service

# Stop service
sudo systemctl stop ask-amy.service

# Restart service
sudo systemctl restart ask-amy.service

# Check status
sudo systemctl status ask-amy.service

# View logs
sudo journalctl -u ask-amy.service -f
```

### Using Docker Compose Directly

```bash
cd /home/jacky/apps/Ask-Amy

# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Health Checks

### Application Health
```bash
# Check if app is responding
curl http://localhost:8507

# Check Docker health status
docker inspect ask-amy-production | grep -A 10 "Health"
```

### Container Status
```bash
# List containers
docker ps | grep ask-amy

# View resource usage
docker stats ask-amy-production
```

## Monitoring

### Logs

**Docker Logs:**
```bash
docker logs ask-amy-production
docker logs -f ask-amy-production  # Follow mode
docker logs --tail 100 ask-amy-production  # Last 100 lines
```

**Systemd Logs:**
```bash
sudo journalctl -u ask-amy.service
sudo journalctl -u ask-amy.service -f  # Follow mode
sudo journalctl -u ask-amy.service --since today
```

### Resource Usage
```bash
# Real-time stats
docker stats ask-amy-production

# Disk usage
docker system df
```

## Updating the Application

### Code Updates

```bash
cd /home/jacky/apps/Ask-Amy

# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Or if using systemd
sudo systemctl restart ask-amy.service
```

### Environment Variable Updates

```bash
# Edit .env file
nano .env

# Rebuild (needed for VITE_* variables)
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

**Note:** `VITE_*` variables are baked into the bundle at build time, so rebuild is required.

## Networking

### Port Configuration
- **Host Port:** 8507
- **Container Port:** 80
- **Network:** local-network (external bridge network)

### Firewall
If needed, allow port 8507:
```bash
sudo ufw allow 8507/tcp
sudo ufw reload
```

### Access
- **Local:** http://localhost:8507
- **Via Cloudflare Tunnel:** Configure tunnel to point to `http://localhost:8507`

## Production Checklist

- [x] Production docker-compose.yml created
- [x] Health checks configured
- [x] Log rotation enabled
- [x] Resource limits set
- [x] Systemd service created
- [x] Auto-restart configured
- [ ] Systemd service installed (run `./setup-systemd.sh`)
- [ ] Cloudflare tunnel configured (if needed)

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs ask-amy-production

# Check if port is in use
sudo netstat -tulpn | grep 8507

# Check if network exists
docker network ls | grep local-network

# Create network if missing
docker network create local-network
```

### Build Failures

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild from scratch
docker compose -f docker-compose.prod.yml build --no-cache --pull
```

### Environment Variable Issues

```bash
# Verify .env file
cat .env

# Check container environment
docker exec ask-amy-production env
```

### Health Check Failing

```bash
# Test manually
docker exec ask-amy-production wget --quiet --tries=1 --spider http://localhost:80/

# Check nginx status
docker exec ask-amy-production nginx -t
```

## Architecture Notes

### Build Process
1. **Build Stage:** Node.js builds Vite app (`npm run build`)
2. **Production Stage:** Nginx serves static files from `/usr/share/nginx/html`
3. **Runtime:** Nginx config uses envsubst to inject `SEARCH_SERVICE_TOKEN`

### Static Files
Built files are located at `/usr/share/nginx/html` in the container

### Nginx Configuration
- Template: `nginx.conf` → `/etc/nginx/templates/default.conf.template`
- Processed at runtime with envsubst
- Final config: `/etc/nginx/conf.d/default.conf`

## Security Considerations

- `.env` file secured with 600 permissions
- Contains sensitive tokens (Supabase, Cal.com, Search Service)
- Never commit `.env` to git
- Regularly rotate API keys
- Use Cloudflare for DDoS protection

## Performance

**Resource Limits:**
- CPU: 1 core (limit), 0.5 core (reservation)
- Memory: 512MB (limit), 256MB (reservation)

**Optimization:**
- Nginx serves pre-built static files
- Gzip compression handled by Nginx
- No runtime Node.js overhead

---

**Last Updated:** 2026-01-04
**Maintained By:** Production deployment automation
