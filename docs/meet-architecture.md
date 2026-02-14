# Quick Meet - Architecture & Configuration

## Overview

Quick Meet is a 1-on-1 WebRTC video/audio call feature built into Ask-Amy. It consists of three services:

| Service | Container | Image | Port | Role |
|---------|-----------|-------|------|------|
| Frontend (React) | `ask-amy` | `ask-amy-ask-amy` | 8507 -> 80 | UI + nginx reverse proxy |
| Signaling Server | `meet-signal` | `ask-amy-meet-signal` | 3100 (internal) | Socket.io room & WebRTC signaling |
| TURN Server | `meet-coturn` | `coturn/coturn:latest` | 3478 (host network) | UDP media relay for restrictive NAT |

## Network Topology

```
                         TCP (信令)                              UDP (音视频媒体)
                    ┌──────────────────┐                    ┌──────────────────────┐
                    │                  │                    │                      │
Browser ──WSS──▶ Cloudflare Tunnel ──▶ ask-amy:8507       Browser ──UDP──▶ 50.92.228.38:3478
                    │                  │  (nginx)              │              (公网 IP)
                    │                  │    │                   │                │
                    │                  │    ▼                   │          Router NAT
                    │                  │  meet-signal:3100      │                │
                    │                  │  (Socket.io)           ▼                ▼
                    └──────────────────┘                    meet-coturn @ 192.168.1.98:3478
                                                           (coturn TURN server)
```

### What goes where?

| Data | Path | Protocol | Via Cloudflare? |
|------|------|----------|-----------------|
| Room create/join, offer/answer, ICE candidates | Browser -> Cloudflare Tunnel -> nginx -> meet-signal | TCP/WSS | Yes |
| Audio + Video media streams | Browser -> 50.92.228.38:3478 -> router -> coturn | UDP | No |

**Important**: TURN relays both audio AND video (all WebRTC media tracks), not just video. Cloudflare Tunnel does not support UDP, so media must go through the direct UDP path.

## Service Details

### 1. Frontend (`ask-amy`)

- **Dockerfile**: `/Dockerfile` (multi-stage: node build + nginx serve)
- **nginx config**: `/nginx.conf`
  - `/` -> serves React SPA from `/usr/share/nginx/html`
  - `/socket.io/` -> reverse proxy to `meet-signal:3100` (WebSocket upgrade)
- **Docker Compose**: `/docker-compose.yml`
- **ICE config**: `/src/pages/MeetPage.jsx`

```js
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:50.92.228.38:3478',
    username: 'meet',
    credential: 'meetpass123',
  },
]
```

ICE negotiation order:
1. Try direct P2P (host candidates)
2. Try STUN (Google servers) to discover public IP
3. Fall back to TURN relay if STUN fails (symmetric NAT, firewall)

### 2. Signaling Server (`meet-signal`)

- **Location**: `/meet-signal/`
- **Runtime**: Node.js 18 + Socket.io 4.7
- **Port**: 3100 (exposed only within Docker network, nginx proxies `/socket.io/`)
- **Events**:
  - `create-room` -> generates 8-char room ID, returns `{ roomId }`
  - `join-room(roomId)` -> joins room (max 2 peers), emits `peer-joined`
  - `signal({ to, data })` -> relays WebRTC offer/answer/ICE candidates
  - `music-sync(payload)` -> relays music playback sync between peers
  - `disconnect` -> cleans up room, emits `peer-left`

### 3. TURN Server (`meet-coturn`)

- **Docker Compose**: `/meet-signal/docker-compose.turn.yml`
- **Config**: `/meet-signal/turnserver.conf`
- **Network mode**: `host` (required for TURN to see real IPs)
- **Ports**:
  - `3478` UDP/TCP - TURN listening port
  - `5349` - TLS listening port
  - `49152-49200` UDP - media relay port range

**turnserver.conf key settings**:
```
external-ip=50.92.228.38/192.168.1.98    # public IP / private IP
realm=meet.ask-amy.vip
user=meet:meetpass123
lt-cred-mech                              # long-term credential mechanism
min-port=49152
max-port=49200
```

## Router Port Forwarding

Router at `192.168.1.254` must forward:

| Protocol | External Port | Internal Target |
|----------|--------------|-----------------|
| UDP | 3478 | 192.168.1.98:3478 |
| UDP | 49152-49200 | 192.168.1.98:49152-49200 |

## Server Info

- **Server hostname**: `saas`
- **Private IP**: `192.168.1.98`
- **Public IP**: `50.92.228.38` (ISP-assigned, may change)
- **SSH access**: `ssh audit-server` (key: `~/.ssh/id_audit_server`)
- **Project path on server**: `/home/jacky/apps/Ask-Amy/`

## Deployment Commands

```bash
# Start/restart TURN server
ssh audit-server "cd /home/jacky/apps/Ask-Amy/meet-signal && docker compose -f docker-compose.turn.yml up -d"

# Rebuild & restart frontend (after MeetPage.jsx changes)
ssh audit-server "cd /home/jacky/apps/Ask-Amy && docker compose build --no-cache ask-amy && docker compose up -d ask-amy"

# Check all meet-related containers
ssh audit-server "docker ps --filter name=meet --filter name=ask-amy"

# View coturn logs
ssh audit-server "docker logs -f meet-coturn"

# View signaling server logs
ssh audit-server "docker logs -f meet-signal"
```

## Known Limitations

- **Dynamic public IP**: `50.92.228.38` is ISP-assigned and may change. If it changes, update both `turnserver.conf` (`external-ip`) and `MeetPage.jsx` (ICE_SERVERS TURN url), then redeploy both services.
- **TURN credentials in frontend**: The `username`/`credential` are visible in client-side JS. This is normal for TURN, but for better security consider implementing time-limited TURN credentials via the signaling server.
- **Max 2 peers**: The signaling server enforces a 1-on-1 limit per room.
- **Cloudflare Tunnel limitation**: Tunnel only carries TCP traffic, so all UDP media must bypass it through direct port forwarding.
