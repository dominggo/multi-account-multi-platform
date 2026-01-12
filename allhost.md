# Complete Infrastructure Overview - All Hosts

**Last Updated:** 2026-01-04
**Total Hosts:** 5 (1 primary 24/7 Proxmox, 2 on-demand Proxmox, 2 Home Assistant OS)
**Network:** Multiple physical LANs, 5 subnets + Tailscale mesh
**Purpose:** Multi-host infrastructure for 24/7 services, on-demand workstations, AI/LLM agents, media automation, and remote monitoring

---

## Quick Reference - All Hosts At A Glance

| Metric | proxmox_t730 | proxmox_k9s | proxmox_z620 | homeassistant_ha | homeassistant_rpi3 | Total |
|--------|--------------|-------------|--------------|------------------|-------------------|-------|
| **Status** | 24/7 Running | On-Demand | On-Demand | 24/7 Running | 24/7 Running | - |
| **Platform** | Proxmox VE | Proxmox VE | Proxmox VE | HA OS 16.3 | HA OS 16.3 | - |
| **CPU Model** | AMD RX-427BB | Xeon E5-2630 v3 | Xeon E5-2643 | i7-4702MQ | BCM2837 (RPi3) | - |
| **Cores/Threads** | 4C/4T | 8C/16T | 4C/8T | **4C/8T** | 4C | 24C/40T |
| **Clock Speed** | ~2.7GHz | 2.4GHz | **3.3GHz** ⭐ | 2.2GHz | ~1.2GHz | - |
| **RAM Total** | 6.7GB | 15.5GB | **23.4GB** ⭐ | 7.7GB | 0.9GB | 54.2GB |
| **RAM Used** | 5.25GB (78%) | 17GB (110%)⚠️ | 20GB (85%) | 3.7GB (48%) | 0.7GB (77%)⚠️ | 46.65GB |
| **Storage Total** | 473GB (ZFS) | 141GB (LVM) | 338GB (LVM) | **458GB** | 28.5GB (SD) | 1,438.5GB |
| **Storage Used** | 72GB (15%) | 3.1GB (2%) | 0.7GB (0.2%) | **317GB (72%)** ⚠️ | 5.3GB (19%) | 398.1GB |
| **LXC Count** | **7** | **1** | 0 | 0 | 0 | 8 |
| **VM Count** | 0 | **3** | **2** | 0 | 0 | 5 |
| **Add-ons** | - | - | - | **18** | **4** | 22 |
| **Network** | 192.168.5.15 | 192.168.6.2 | 192.168.52.2 | 192.168.0.5 | 192.168.2.100 | - |
| **Tailscale** | 100.125.174.105 | 100.89.48.16 | 100.78.161.54 | 100.112.100.112 | TBD | - |
| **Primary Role** | Services & Apps | Multi-VM + Ollama | High-Perf VM | Media & Automation | Remote HA | - |

---

## Host Specifications - Detailed Comparison

### proxmox_t730 (Primary 24/7 Host)

**Hardware:**
- **CPU:** AMD RX-427BB with Radeon R7 Graphics
- **Cores:** 4 cores, 4 threads
- **RAM:** 6.7GB total (5.25GB allocated = 78%) - Optimized 2026-01-03
- **Kernel:** Linux 6.14.11-1-pve
- **Proxmox:** 9.0.6

**Storage:**
- `local` (dir): 39GB total, 6.1GB used (15.67%)
- `local-lvm` (lvmthin): 56GB total, 2GB used (3.62%)
- `lxcstore` (zfspool): 473GB total, 72GB used (15.20%)
- `vmstore` (zfspool): 473GB total, 72GB used (15.20%)
- Mount: `/mnt/lxc-share` (458GB HDD)
- Mount: `/mnt/data` (400GB ZFS dataset)

**Network:**
- Subnet: 192.168.5.0/24
- IP: 192.168.5.15
- Gateway: 192.168.5.1
- Tailscale: 100.125.174.105
- Tailscale Domain: ibis-arctic.ts.net

**Workload:** 7 LXC containers, 0 VMs
**Uptime:** 24/7
**Purpose:** Core services (web, database, automation) + AI/LLM agent (LangChain)

---

### proxmox_k9s (Multi-VM Workstation)

**Hardware:**
- **CPU:** Intel Xeon E5-2630 v3 @ 2.40GHz
- **Cores:** 8 cores, 16 threads ⭐ (MOST THREADS)
- **RAM:** 15.5GB total (~11GB used = 71%)
- **Kernel:** Linux 6.14.11-3-pve
- **Proxmox:** 9.0.10

**Storage:**
- `local` (dir): 68GB total, 14GB used (21%)
- `local-lvm` (lvmthin): 141GB total, 3.1GB used (2.23%)
- `shared-nfs` (nfs): 68GB shared (19.82% used)
- **Physical Disks:**
  - NVMe SSD: 238.5GB (system)
  - HDD 1 (`sda`): 465.8GB - **AVAILABLE** ✨
  - HDD 2 (`sdb`): 465.8GB - **AVAILABLE** ✨
  - HDD 3 (`sdc`): 465.8GB - **AVAILABLE** ✨
  - HDD 4 (`sdd`): 465.8GB - **PARTITIONED** (VM passthrough)

**Network:**
- Subnet: 192.168.6.0/24
- IP: 192.168.6.2
- Gateway: 192.168.6.1
- Tailscale: 100.89.48.16
- Tailscale Domain: ibis-arctic.ts.net

**Workload:** 1 LXC (Ollama), 3 VMs
**Uptime:** On-demand (5+ hours typical)
**Purpose:** Multiple VM workstations + printer server + Ollama LLM inference
**Note:** **BEST FOR OLLAMA** (16 threads + 3 unused HDDs) - LXC 300 deployed 2026-01-03

---

### proxmox_z620 (High-Performance Workstation)

**Hardware:**
- **CPU:** Intel Xeon E5-2643 @ 3.30GHz ⭐ (FASTEST CLOCK)
- **Cores:** 4 cores, 8 threads
- **RAM:** 23.4GB total ⭐ (MOST RAM) (~20GB used = 85%)
- **Kernel:** Linux 6.14.11-3-pve
- **Proxmox:** 9.0.10

**Storage:**
- `local` (dir): 94GB total, 12GB used (13%)
- `local-lvm` (lvmthin): 338GB total, 0.7GB used (0.20%)
- `shared-nfs` (nfs): 68GB shared (19.82% used)
- **Physical Disks:**
  - HDD 1 (`sda`): 149GB - **AVAILABLE** ✨
  - HDD 2 (`sdb`): 465.8GB - **AVAILABLE** ✨
  - HDD 3 (`sdc`): 465.8GB (system disk with LVM)
  - SSD (`sdd`): 232.9GB - **PARTITIONED** (150GB to VM, ~82GB free)

**Network:**
- Subnet: 192.168.52.0/24
- IP: 192.168.52.2
- Gateway: 192.168.52.1
- Tailscale: 100.78.161.54
- Tailscale Domain: ibis-arctic.ts.net

**Workload:** 0 LXC, 2 VMs
**Uptime:** On-demand (~1 hour typical)
**Purpose:** Single high-performance Windows VM
**Note:** Fastest single-threaded performance (3.3GHz)

---

### homeassistant_ha (Media & Automation Hub)

**Hardware:**
- **CPU:** Intel Core i7-4702MQ @ 2.20GHz
- **Cores:** 4 cores, 8 threads
- **RAM:** 7.7GB total (3.7GB used, 2.0GB swap used)
- **OS:** Home Assistant OS 16.3
- **Kernel:** 6.12.51-haos
- **Architecture:** amd64 (generic-x86-64)

**Storage:**
- `/dev/sda1`: 458.4GB total, 316.7GB used (72%) ⚠️
- **Primary Usage:** Media files (Jellyfin library)

**Network:**
- Subnet: 192.168.0.0/24
- IP: 192.168.0.5
- Gateway: 192.168.0.1
- Tailscale: 100.112.100.112
- Tailscale Domain: ibis-arctic.ts.net
- Supervisor Network: 172.30.32.1/23

**Workload:** 18 Home Assistant add-ons (15 running)
**Uptime:** 24/7
**Purpose:** Media automation stack (Jellyfin, *arr apps) + document management + smart home
**Note:** ⚠️ High swap usage (80%), recommend RAM upgrade to 16GB

---

### homeassistant_rpi3 (Remote Home Assistant)

**Hardware:**
- **CPU:** Broadcom BCM2837 (Raspberry Pi 3)
- **Cores:** 4 cores, ~1.2GHz
- **RAM:** 904 MB total (696 MB used = 77%)
- **Swap:** 299 MB (100% used) ⚠️ RAM PRESSURE
- **Kernel:** Linux 6.12.47-haos-raspi
- **HA OS:** 16.3 (Alpine Linux 3.22.2)
- **HA Core:** 2025.12.5

**Storage:**
- **Total:** 28.5GB (microSD card - /dev/mmcblk0p8)
- **Used:** 5.3GB (19%)
- **Available:** 22.1GB
- **Type:** microSD card (consider SSD boot for reliability)

**Network:**
- Subnet: 192.168.2.0/24
- IP: 192.168.2.100
- Gateway: 192.168.2.1
- Tailscale: TBD (add-on installed but IP not confirmed)
- Tailscale Domain: ibis-arctic.ts.net
- Supervisor Network: 172.30.32.1/23

**Workload:** 4 Home Assistant add-ons (all running)
**Uptime:** 24/7
**Purpose:** Remote location monitoring + Tailscale VPN access + minimal smart home automation
**Note:** ⚠️ Swap 100% used - RAM pressure despite minimal add-ons. Consider RPi4 upgrade (4GB+ RAM)

**Add-ons Installed:**
1. Tailscale (0.26.1) - VPN mesh networking
2. Advanced SSH & Web Terminal (22.0.3) - Remote access with zsh
3. File Editor (5.8.0) - Configuration editing
4. Samba Share (12.5.4) - SMB file sharing

---

## LXC Container Inventory (t730 + k9s)

| VMID | Name | IP | OS | Cores | RAM | Swap | Disk | Purpose | Auto-Start |
|------|------|-----|-----|-------|-----|------|------|---------|------------|
| 105 | tailscale-lxc | 192.168.5.16 / 100.125.174.105 | Alpine | 1 | 256MB | 512MB | 2GB | Tailscale VPN + Caddy proxy + **Dnsmasq DNS (multi-interface)** | Yes |
| 106 | webserver | 192.168.5.17 | Debian | 2 | **1GB** | 512MB | 4GB | Nginx + PHP-FPM + **Samba** (shared webserver) **[Restructured 2026-01-04]** | Yes |
| 107 | mariadb | 192.168.5.20 | Debian | 2 | 1GB | 512MB | 20GB | MariaDB 10.11 (shared database) | Yes |
| 108 | nodejs-whatsapp | 192.168.5.18 | Debian | 1 | 512MB | 512MB | 2GB | WhatsApp Campaign Manager API | Yes |
| 109 | ariang | 192.168.5.29 | Debian | 1 | 512MB | 512MB | 14GB | AriaNg torrent web interface | Yes |
| 110 | ha-container | 192.168.5.32 | Debian | 2 | 1GB | 512MB | 6GB | Home Assistant + Docker | Yes |
| **112** | **langchain-ai** | **192.168.5.105 / 100.111.31.126** | **Debian 12** | **2** | **2GB** | **1GB** | **20GB** | **LangChain AI (Claude Haiku + Ollama) + Tailscale** **[DEPLOYED 2026-01-04]** | **Yes** |
| **300** | **ollama-llm** | **192.168.6.34 / 100.89.48.16** | **Debian 12** | **4** | **6GB** | **2GB** | **50GB** | **Ollama LLM Server (llama3:8b, phi3:mini)** **[DEPLOYED 2026-01-04]** | **No** |

**Total LXC:** 8 containers (7 on t730, 1 on k9s)
**Total RAM:** 11.25GB allocated
**Total Disk:** ~118GB used
**CPU Allocation:** 15 cores total

### Key Services in LXC Containers

**LXC 105 - Tailscale/Caddy/DNS:**
- Tailscale VPN: 100.125.174.105
- Caddy reverse proxy for `.aku` domains
- Dnsmasq DNS server on Tailscale + LAN (multi-interface)
- Exposes: jelly.aku, proxmox.aku, torrent.aku, movie.aku, tv.aku, seer.aku, whatsapp.aku

**LXC 106 - Shared Webserver:**
- Nginx 1.22.1 + PHP 8.2.29 + Samba (SMB)
- Sites: tada.kahwin.space, whatsapp.local (restructured 2026-01-04)
- PHP-FPM socket: `/run/php/php8.2-fpm.sock`
- SMB share: `\\192.168.5.17\webroot`

**LXC 107 - Shared Database:**
- MariaDB 10.11
- Databases: wa_campaign (WhatsApp app)
- Accessible from: LXC 106, LXC 108

**LXC 108 - WhatsApp API:**
- Node.js service (port 3000)
- Static IP: 192.168.5.18
- Purpose: WhatsApp Campaign Manager backend

**LXC 109 - AriaNg:**
- Torrent web interface
- DHCP IP: 192.168.5.29

**LXC 110 - Home Assistant:**
- Smart home automation
- Docker-in-LXC setup
- DHCP IP: 192.168.5.32

**LXC 112 - LangChain AI Agent (DEPLOYED 2026-01-04):**
- **Host:** proxmox_t730
- **IP:** 192.168.5.105 (LAN) / 100.111.31.126 (Tailscale)
- **Purpose:** Hybrid LLM orchestration and routing
- **Stack:** Python 3.11, LangChain, Flask REST API
- **Models:** Claude 3 Haiku (via API) + Ollama (via k9s)
- **API:** http://192.168.5.105:5000
- **Endpoints:**
  - `/health` - Service health check
  - `/query` - Main query endpoint (intelligently routes to Claude or Ollama)
  - `/routes` - Available data type routing options
- **Routing Logic:**
  - Sensitive/Private data → Ollama (FREE, privacy-preserving)
  - Complex reasoning → Claude Haiku (PAID, $0.0014/query)
  - Bulk processing → Ollama phi3:mini (FREE, fast)
- **Tailscale:** Subnet routing enabled for cross-subnet access to k9s
- **Ollama Connection:** http://192.168.6.34:11434 (LAN IP via Tailscale routing)
- **Cost:** $1-4/month (vs $30/month pure Claude Sonnet)
- **Status:** ✅ Deployed and ready for testing

**LXC 300 - Ollama LLM Server (DEPLOYED 2026-01-04):**
- **Host:** proxmox_k9s
- **IP:** 192.168.6.34 (LAN) / 100.89.48.16 (Tailscale)
- **Purpose:** Local LLM inference for privacy-sensitive queries
- **Models:** llama3:8b (4.7GB), phi3:mini (2.2GB) - ✅ Installed
- **Storage:** /dev/sda (465GB HDD) for models
- **API (Primary):** http://192.168.6.34:11434 (LAN - use this for internal)
- **API (Fallback):** http://100.89.48.16:11434 (Tailscale - for external)
- **CPU:** 4 cores (16 threads on host - ideal for parallel inference)
- **RAM:** 6GB (⚠️ VMs must shutdown when Ollama runs - 142% overcommit)
- **Access:** LXC 112 (t730) connects via LAN (192.168.6.34) via Tailscale subnet routing
- **Cost:** FREE (no API charges)
- **Status:** ✅ Running

---

## VM Inventory (proxmox_k9s + proxmox_z620)

### proxmox_k9s VMs

| VMID | Name | OS | Cores | RAM | Disk | IP (approx) | Purpose | Auto-Start |
|------|------|----|-------|-----|------|-------------|---------|------------|
| 200 | winvm | Windows | 16 | 7GB (balloon: 5-7GB) | 232GB + 186GB (passthrough) | 192.168.6.x | Windows workstation | No |
| 201 | mintvm | Linux Mint | 4 | 8GB | 46GB (passthrough) | 192.168.6.x | Linux Mint workstation | No |
| 202 | k9s-printer | Debian 13 | 2 | 1GB | 10GB | 192.168.6.x | Printer server (USB: HP 03f0:3e17) | No |

**Disk Passthrough Details:**
- VM 200: `/dev/sdd1` (232.8GB) + `/dev/sdd3` (186.4GB NTFS)
- VM 201: `/dev/sdd2` (46.6GB)
- VM 202: LVM thin pool (10GB)

**USB Passthrough:**
- VM 202: HP Printer (03f0:3e17)

**Total VMs:** 3
**Total RAM:** 16GB allocated (103% with balloon)
**Total Cores:** 22 vCPUs (138% overcommit)

---

### proxmox_z620 VMs

| VMID | Name | OS | Cores | RAM | Disk | IP (approx) | Purpose | Auto-Start |
|------|------|----|-------|-----|------|-------------|---------|------------|
| 301 | z620-print | Linux | 2 | 1GB | 2GB | 192.168.52.x | Printer server (USB: HP 03f0:1d17) | **YES** ✅ |
| 400 | win-z620 | Windows | 8 | 20GB | 150GB (SSD passthrough) | 192.168.52.x | High-performance Windows VM | No |

**Disk Passthrough Details:**
- VM 400: `/dev/sdd1` (150GB SSD)
- VM 301: LVM thin pool (2GB)

**USB Passthrough:**
- VM 301: HP Printer (03f0:1d17) - USB 3.0
- VM 400: HP Device (03f0:8911) + SanDisk USB (0781:556b) - USB 3.0

**Total VMs:** 2
**Total RAM:** 21GB allocated (90% utilization)
**Total Cores:** 10 vCPUs (125% overcommit)

---

## Network Topology - Complete Overview

### Network Subnets

| Host | Subnet | Host IP | Gateway | Bridge | Physical NIC |
|------|--------|---------|---------|--------|--------------|
| t730 | 192.168.5.0/24 | 192.168.5.15 | 192.168.5.1 | vmbr0 | N/A |
| k9s | 192.168.6.0/24 | 192.168.6.2 | 192.168.6.1 | vmbr0 | enp7s0 (Realtek) |
| z620 | 192.168.52.0/24 | 192.168.52.2 | 192.168.52.1 | vmbr0 | eno1 (Intel) |

**Note:** All three hosts are on the same physical LAN but use different subnets (possibly VLANs or separate network segments).

### Tailscale VPN Mesh Network

| Host | Tailscale IP | IPv6 | Network Name | DNS |
|------|--------------|------|--------------|-----|
| t730 | 100.125.174.105 | N/A | ibis-arctic.ts.net | 100.100.100.100 |
| k9s | 100.89.48.16 | fd7a:115c:a1e0::fc01:fd3f | ibis-arctic.ts.net | 100.100.100.100 |
| z620 | 100.78.161.54 | fd7a:115c:a1e0::b201:a13a | ibis-arctic.ts.net | 100.100.100.100 |

**Tailscale Features:**
- All hosts connected via secure mesh VPN
- MagicDNS enabled (100.100.100.100)
- Custom `.aku` domain via Dnsmasq on t730 (LXC 105)
- Cross-host communication via Tailscale IPs

### LXC/VM Network Details

**proxmox_t730 - LXC Containers:**
| VMID | Name | IP | MAC | DHCP/Static |
|------|------|-----|-----|-------------|
| 105 | tailscale-lxc | 192.168.5.16 | BC:24:11:EE:09:80 | DHCP (stable) |
| 106 | webserver | 192.168.5.17 | BC:24:11:EE:09:86 | DHCP (stable) |
| 107 | mariadb | 192.168.5.20 | BC:24:11:EE:09:87 | DHCP (stable) |
| 108 | nodejs-whatsapp | 192.168.5.18 | BC:24:11:EE:09:88 | **Static** |
| 109 | ariang | 192.168.5.29 | BC:24:11:EE:09:89 | DHCP |
| 110 | ha-container | 192.168.5.32 | BC:24:11:EE:09:90 | DHCP |

**proxmox_k9s - VMs:**
| VMID | Name | MAC | TAP Interface | Notes |
|------|------|-----|---------------|-------|
| 200 | winvm | BC:24:11:13:3A:BC | tap200i0 | VirtIO, 1500 MTU |
| 201 | mintvm | BC:24:11:7F:DB:C9 | tap201i0 | VirtIO, 1500 MTU |
| 202 | k9s-printer | BC:24:11:E6:25:B5 | tap202i0 | VirtIO, 1500 MTU |

**proxmox_z620 - VMs:**
| VMID | Name | MAC | TAP Interface | Notes |
|------|------|-----|---------------|-------|
| 301 | z620-print | BC:24:11:49:12:26 | tap301i0 | VirtIO, 1500 MTU |
| 400 | win-z620 | BC:24:11:0B:F1:30 | tap400i0 | VirtIO, 1500 MTU |

### Port Mapping (proxmox_t730)

| Container | Service | Port | Protocol | Access | Purpose |
|-----------|---------|------|----------|--------|---------|
| LXC 105 | Caddy | 80, 443 | TCP | Tailscale | Reverse proxy |
| LXC 105 | Dnsmasq | 53 | TCP/UDP | Tailscale | DNS resolver |
| LXC 106 | Nginx | 80 | TCP | Internal | Webserver |
| LXC 107 | MariaDB | 3306 | TCP | Internal | Database |
| LXC 108 | Node.js | 3000 | TCP | Internal | WhatsApp API |
| LXC 110 | Docker | Various | TCP | Internal | Home Assistant |

### Caddy Reverse Proxy Routes (LXC 105)

| Domain | Target | Service |
|--------|--------|---------|
| jelly.aku | 100.112.100.112:8096 | Jellyfin media server |
| proxmox.aku | 192.168.5.15:8006 | Proxmox web UI |
| torrent.aku | 100.112.100.112:8081 | qBittorrent |
| movie.aku | 100.112.100.112:7878 | Radarr (movies) |
| tv.aku | 100.112.100.112:8989 | Sonarr (TV shows) |
| seer.aku | 100.112.100.112:5055 | Overseerr (requests) |
| whatsapp.aku | 192.168.5.17:80 | WhatsApp Campaign Manager |

---

## Resource Allocation Summary

### CPU Allocation

| Host | Physical | Allocated (LXC/VM) | Overcommit | Usage Pattern |
|------|----------|-------------------|------------|---------------|
| t730 | 4C/4T | 9 cores (LXC) | 225% | Light, distributed |
| k9s | 8C/16T | 22 cores (VM) | 138% | Heavy when active |
| z620 | 4C/8T | 10 cores (VM) | 125% | Single VM focus |
| **Total** | **16C/28T** | **41 vCPUs** | **146%** | Acceptable |

### RAM Allocation

| Host | Physical | Allocated | Used | Free | Utilization |
|------|----------|-----------|------|------|-------------|
| t730 | 6.7GB | 5.25GB | ~2.9GB actual | ~3.8GB | 78% allocated |
| k9s | 15.5GB | 16GB (balloon) | ~11GB | ~3.2GB | 103% w/ balloon |
| z620 | 23.4GB | 21GB | ~20GB | ~2.9GB | 90% |
| **Total** | **45.6GB** | **42.25GB** | **~33.9GB** | **~9.9GB** | **93%** |

### Storage Summary

| Host | Type | Total | Used | Available | Usage % |
|------|------|-------|------|-----------|---------|
| t730 | ZFS (lxcstore) | 473GB | 72GB | 401GB | 15% |
| t730 | LVM thin (local-lvm) | 56GB | 2GB | 54GB | 4% |
| k9s | LVM thin (local-lvm) | 141GB | 3.1GB | 138GB | 2% |
| k9s | NVMe SSD (system) | 238GB | - | - | - |
| k9s | **3x HDD unused** | **1,397GB** | **0GB** | **1,397GB** | **0%** ⭐ |
| z620 | LVM thin (local-lvm) | 338GB | 0.7GB | 337GB | 0.2% |
| z620 | **2x HDD unused** | **615GB** | **0GB** | **615GB** | **0%** ⭐ |

**Available for Expansion:** 2,012GB unused HDD storage across k9s and z620

---

## Hardware Comparison

### CPU Performance Tiers

| Tier | Host | CPU | Cores/Threads | Clock | Best For |
|------|------|-----|---------------|-------|----------|
| 🥇 **Speed** | z620 | Xeon E5-2643 | 4C/8T | **3.3GHz** | Single-threaded, responsive desktop |
| 🥇 **Threads** | k9s | Xeon E5-2630 v3 | **8C/16T** | 2.4GHz | Multi-threaded, parallel workloads |
| 🥉 **Efficiency** | t730 | AMD RX-427BB | 4C/4T | ~2.7GHz | Low-power 24/7 services |

### GPU/Graphics

| Host | GPU | Model | Status |
|------|-----|-------|--------|
| t730 | Integrated | AMD Radeon R7 | Active |
| k9s | Discrete | NVIDIA Quadro K420 | Available for passthrough |
| z620 | Discrete | NVIDIA NVS 310 | Available for passthrough |

### Network Interfaces

| Host | NIC 1 | NIC 2 | USB 3.0 | Notes |
|------|-------|-------|---------|-------|
| t730 | N/A | N/A | No | Integrated network |
| k9s | Realtek RTL8111 (active) | Broadcom BCM5761 (unused) | No | Dual NIC |
| z620 | Intel 82579LM (active) | Intel 82574L (unused) | Yes (TI xHCI) | Dual NIC + USB 3.0 |

---

## Use Case Mapping

### By Host Role

**proxmox_t730 (24/7 Services):**
- ✅ Web hosting (Nginx + PHP)
- ✅ Database (MariaDB)
- ✅ VPN/DNS (Tailscale + Dnsmasq)
- ✅ Reverse proxy (Caddy)
- ✅ WhatsApp automation
- ✅ Home automation (Home Assistant)
- ✅ Torrent management (AriaNg)
- ⚠️ RAM constraint: Already at 78%, limited expansion room

**proxmox_k9s (Multi-VM Workstation):**
- ✅ Windows desktop environment (16 cores)
- ✅ Linux desktop environment (4 cores, 8GB)
- ✅ Network printer (USB passthrough)
- ✅ **Best for Ollama LLM** (16 threads + 3 unused HDDs)
- ⚠️ Disk passthrough: No Proxmox snapshots for VMs 200/201

**proxmox_z620 (High-Performance VM):**
- ✅ High-performance Windows (20GB RAM, 3.3GHz)
- ✅ Network printer (USB passthrough, auto-start)
- ✅ Single-threaded intensive tasks (fastest clock)
- ✅ Memory-intensive applications (most RAM)
- ⚠️ Only 8 threads: Less suitable for Ollama than k9s

### By Application Type

**Development/Programming:**
- t730 LXC 106/107/108 (PHP, Node.js, MariaDB)
- k9s VM 201 (Linux Mint, 4C/8GB)
- z620 VM 400 (Windows, 8C/20GB)

**Media/Entertainment:**
- Jellyfin, Radarr, Sonarr via Caddy on t730
- k9s VMs for desktop use

**Automation:**
- WhatsApp Campaign (t730 LXC 106/107/108)
- Home Assistant (t730 LXC 110)

**Printing:**
- k9s VM 202 (HP printer)
- z620 VM 301 (HP printer, auto-start)

---

## AI/LLM Deployment Analysis

### Ollama Deployment Recommendation

**Winner: proxmox_k9s** 🏆

| Factor | t730 | k9s | z620 | Winner |
|--------|------|-----|------|--------|
| Threads | 4 | **16** ⭐ | 8 | k9s |
| RAM Available | ~1.45GB | ~4.5GB | ~3.4GB | k9s |
| Storage (unused HDD) | 0GB | **1,397GB** ⭐ | 615GB | k9s |
| Clock Speed | ~2.7GHz | 2.4GHz | **3.3GHz** | z620 |
| 24/7 Availability | ✅ | ❌ | ❌ | t730 |
| Power Efficiency | ✅ | ❌ | ❌ | t730 |
| **Best For** | LangChain | **Ollama** 🏆 | Large models | - |

**Deployment Plan:**
1. **LangChain on t730:** LXC 112 (2GB RAM, 20GB disk)
   - Python + LangChain + ChromaDB
   - 24/7 availability for queries
   - Connects to Ollama via Tailscale

2. **Ollama on k9s:** LXC or VM (4-6GB RAM, 50GB+ disk on unused HDD)
   - Install on one of the 3 unused 465GB HDDs
   - Pull models: llama2, phi3, mistral (7B-13B params)
   - Auto-shutdown when idle (power savings)
   - LangChain connects via: `http://100.89.48.16:11434`

**Network Flow:**
```
User → t730 (LangChain LXC 112) → Tailscale → k9s (Ollama) → Response
        ↓
   ChromaDB (vector DB)
        ↓
   Documents/Data
```

---

## Backup & Recovery

### Current Backup Status

| Host | Automated Backups | Backup Directory | Strategy |
|------|-------------------|------------------|----------|
| t730 | ❌ Not configured | `/var/lib/vz/dump/` | Manual snapshots recommended |
| k9s | ❌ Not configured | `/var/lib/vz/dump/` | OS-level backups (passthrough disks) |
| z620 | ❌ Not configured | `/var/lib/vz/dump/` | OS-level backups (passthrough disks) |

### Backup Recommendations

**t730 (Critical 24/7 Services):**
- Weekly LXC snapshots: `vzdump 105 106 107 108 110 --storage local --compress zstd`
- Daily MariaDB dumps: `mysqldump --all-databases`
- Critical configs: `/etc/nginx`, `/etc/caddy`, `/etc/dnsmasq.conf`

**k9s/z620 (VMs with Disk Passthrough):**
- Cannot use Proxmox snapshots (passthrough disks)
- Use Windows/Linux native backup tools
- Consider vzdump for printer VMs (LVM-based)

---

## Network Connectivity Matrix

### Host-to-Host Communication

| From ↓ To → | t730 | k9s | z620 |
|-------------|------|-----|------|
| **t730** | - | ✅ Tailscale (100.89.48.16)<br>⚠️ LAN may work | ✅ Tailscale (100.78.161.54)<br>⚠️ LAN may work |
| **k9s** | ✅ Tailscale (100.125.174.105)<br>⚠️ LAN may work | - | ✅ Tailscale (100.78.161.54)<br>⚠️ LAN may work |
| **z620** | ✅ Tailscale (100.125.174.105)<br>⚠️ LAN may work | ✅ Tailscale (100.89.48.16)<br>⚠️ LAN may work | - |

**Note:** All hosts on same physical LAN but different subnets. Tailscale is preferred for reliable cross-host communication.

### External Access

**Via Tailscale (Recommended):**
- t730 Proxmox: `https://100.125.174.105:8006`
- k9s Proxmox: `https://100.89.48.16:8006`
- z620 Proxmox: `https://100.78.161.54:8006`

**Via Caddy (t730 services only):**
- Proxmox UI: `https://proxmox.aku` → 192.168.5.15:8006
- WhatsApp App: `https://whatsapp.aku` → 192.168.5.17/whatsapp
- Media services: `https://jelly.aku`, `https://torrent.aku`, etc.

---

## Power Consumption Estimates

| Host | Status | Est. Power | Annual Cost (RM0.50/kWh) |
|------|--------|------------|--------------------------|
| t730 | 24/7 | ~50W | ~219 RM/year |
| k9s | On-demand (8hrs/day avg) | ~150W | ~219 RM/year |
| z620 | On-demand (4hrs/day avg) | ~180W | ~131 RM/year |
| **Total** | - | **~380W max** | **~569 RM/year** |

**Savings Potential:**
- Running Ollama on k9s (on-demand) vs cloud API: ~RM24/month
- Total infrastructure cost: ~RM47/month for 24/7 + on-demand usage

---

## Quick Commands Reference

### Cross-Host Operations

```bash
# SSH between hosts via Tailscale
ssh root@100.125.174.105  # t730
ssh root@100.89.48.16     # k9s
ssh root@100.78.161.54    # z620

# Copy files between hosts
scp file.txt root@100.89.48.16:/root/

# Check all hosts status (run from any host with Tailscale)
for host in 100.125.174.105 100.89.48.16 100.78.161.54; do
  echo "=== $host ==="
  ssh root@$host "hostname && uptime"
done
```

### Resource Monitoring

```bash
# Check RAM across all hosts (Tailscale required)
for host in 100.125.174.105 100.89.48.16 100.78.161.54; do
  echo "=== $host ==="
  ssh root@$host "free -h"
done

# Check all VMs/containers
ssh root@100.125.174.105 "pct list"  # t730 containers
ssh root@100.89.48.16 "qm list"      # k9s VMs
ssh root@100.78.161.54 "qm list"     # z620 VMs
```

---

## Migration Considerations

### Potential Optimizations

1. **Migrate Printer VMs to t730:**
   - Move k9s VM 202 and z620 VM 301 to t730 as LXC containers
   - Benefit: 24/7 printer availability without running k9s/z620
   - Free up: 3GB RAM combined

2. **Consolidate Shared Services:**
   - All shared services already on t730 (optimal)
   - k9s and z620 focus on desktop VMs (good separation)

3. **Ollama Deployment:**
   - Deploy on k9s (16 threads, unused storage)
   - Connect from t730 via Tailscale
   - Auto-shutdown k9s when idle

---

## Change Log

**2026-01-04:**
- ✅ **Home Assistant OS Host Added:**
  - Documented homeassistant_ha (192.168.0.5 / 100.112.100.112)
  - 18 add-ons catalogued (Jellyfin, Paperless-ngx, *arr stack, etc.)
  - SSH access method documented (MAC algorithm workaround)
  - Integration with Proxmox Caddy reverse proxy
- ✅ **AI Infrastructure Deployed:**
  - LXC 112 (langchain-ai): Tailscale added, IP 100.111.31.126
  - LXC 300 (ollama-llm): Deployed on k9s with models
  - Cross-subnet communication working via Tailscale routing
- ✅ **LXC 106 (webserver) Updated:**
  - Nginx restructured (tada.kahwin.space, whatsapp.local, shared, default)
  - Samba/SMB added: `\\192.168.5.17\webroot`
  - File ownership: remote:www-data
- ✅ **LXC 105 (tailscale-lxc) Updated:**
  - Dnsmasq now serves DNS on both Tailscale + LAN (multi-interface)

**2026-01-02:**
- ✅ Initial comprehensive overview created
- ✅ All 3 Proxmox hosts fully documented
- ✅ 6 LXC containers mapped (t730)
- ✅ 5 VMs mapped (k9s: 3, z620: 2)
- ✅ Network topology documented
- ✅ Ollama deployment analysis completed
- ✅ Resource allocation calculated

---

## Summary Statistics

**Infrastructure Totals:**
- **Hosts:** 3 (1 primary 24/7, 2 on-demand)
- **CPU Cores:** 16 physical cores, 28 threads
- **RAM:** 45.6GB total, 42.25GB allocated, ~33.9GB actual usage
- **LXC Containers:** 6 (all on t730)
- **VMs:** 5 (k9s: 3, z620: 2)
- **Networks:** 3 subnets + 1 Tailscale mesh
- **Unused Storage:** 2,012GB HDDs available for expansion
- **Auto-Start Services:** 6 LXC + 1 VM (z620 printer)

**Recommended Next Steps:**
1. Deploy Ollama on k9s (utilize unused HDDs)
2. Deploy LangChain on t730 (LXC 112, 2GB RAM)
3. Configure automated backups for t730 LXC containers
4. Consider printer VM migration to t730 for 24/7 availability
5. Utilize unused 2TB of HDD storage for additional services

---

**Maintained by:** Infrastructure Team
**Review Frequency:** Monthly or after major changes
**Related Documentation:**
- [proxmox_t730.md](proxmox_t730.md) - Primary 24/7 Proxmox host details
- [proxmox_k9s.md](proxmox_k9s.md) - Multi-VM workstation details
- [proxmox_z620.md](proxmox_z620.md) - High-performance VM details
- [homeassistant_ha.md](homeassistant_ha.md) - Home Assistant OS media & automation hub
- [AI Planning](../planning/ai_agent_infrastructure_planning.md) - Deployment strategies
