# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-account Telegram & WhatsApp web client for managing multiple messaging accounts. Deployed on Proxmox LXC containers.

**Status:** ✅ Deployed & Operational (January 2026)
**Access:** http://192.168.5.17

## Architecture

```
Browser → Nginx (LXC 106:80) → API Gateway (LXC 108:3000)
                                    ├── Telegram Backend (LXC 113:8001) - Python/FastAPI/Telethon
                                    ├── WhatsApp Backend (LXC 114:8002) - Node.js/Baileys
                                    └── MariaDB (LXC 107:3306)
```

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- API Gateway: Node.js 20 + Express + JWT auth
- Telegram: Python 3.11 + FastAPI + Telethon (official API)
- WhatsApp: Node.js 20 + Baileys (web protocol)
- Database: MariaDB 10.11

## Build & Development Commands

```bash
# Frontend (port 5173)
cd frontend && npm run dev      # Dev server with HMR
cd frontend && npm run build    # Production build
cd frontend && npm run lint     # ESLint

# API Gateway (port 3000)
cd backend-api && npm run dev   # Dev with tsx watch
cd backend-api && npm run build # Compile TypeScript

# Telegram Backend (port 8001)
cd backend-telegram && python main.py
# or: uvicorn main:app --reload --port 8001

# WhatsApp Backend (port 8002)
cd backend-whatsapp && npm run dev   # Dev with tsx watch
cd backend-whatsapp && npm run build # Compile TypeScript
```

## Key Directories

- `frontend/src/store/` - Zustand state (persists to localStorage)
- `frontend/src/api/` - Axios API client with JWT injection
- `backend-api/src/routes/` - Express route handlers
- `backend-telegram/` - Single main.py with FastAPI app
- `backend-whatsapp/src/` - TypeScript source
- `database/schema.sql` - Full MySQL schema with stored procedures

## Authentication Flows

**Web App:** JWT tokens (7-day expiry), Bearer header, bcrypt passwords

**Telegram:** Phone → Request code → Verify code → (Optional 2FA) → Session file saved

**WhatsApp:** Phone → QR code generated → User scans with mobile app → Multi-file auth state saved

## Session Storage

- Telegram sessions: `backend-telegram/sessions/{phone_number}.session`
- WhatsApp sessions: `backend-whatsapp/sessions/{phone_number}/` (multi-file auth state)
- Frontend auth: localStorage key `messaging-platform-storage`

## Real-time Communication

Socket.io between frontend and backends for:
- QR code updates (WhatsApp)
- Connection status changes
- New message notifications

Events: `qr-code`, `connection-status`, `new-message`

## Database Tables

Core: `accounts`, `sessions`, `messages`, `contacts`, `users`
Logging: `keep_alive_logs`, `audit_logs`, `web_sessions`
Views: `v_active_accounts`, `v_message_stats`

## Environment Variables

Each service has `.env.example`. Key variables:
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` - From https://my.telegram.org
- `DB_HOST=192.168.5.20`, `DB_NAME=messaging_platform`
- `JWT_SECRET`, `SESSION_SECRET` - Random secrets
- `ALLOWED_ORIGINS` - CORS whitelist

## Deployment (Proxmox t730)

```bash
# SSH to containers via Proxmox host
ssh root@192.168.5.15
pct exec 108 -- bash  # API Gateway
pct exec 113 -- bash  # Telegram
pct exec 114 -- bash  # WhatsApp

# Service management
systemctl restart telegram-backend
systemctl restart whatsapp-backend
systemctl restart api-gateway
```

Service files: `/etc/systemd/system/{service}-backend.service`
Install paths: `/opt/{telegram,whatsapp,api}-backend/`

## Important Notes

- WhatsApp uses Baileys (unofficial) - accounts may get banned
- Telegram uses official API via Telethon - more reliable
- Keep-alive system sends messages every 24h to prevent deactivation
- Frontend Vite proxy: `/api/*` → `http://localhost:3000` in development
