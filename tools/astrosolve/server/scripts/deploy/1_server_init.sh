#!/usr/bin/env bash

# =============================================================================
# 1_server_init.sh — Astrosolve Remote Server Setup
# =============================================================================
# One-time bootstrap script that prepares a fresh Ubuntu server for running
# the Astrosolve backend. Run this once when provisioning a new server.
#
# What this script does:
#   - Installs Docker Engine (via 1a_init_docker.sh)
#   - Creates a dedicated non-root deploy user with SSH access
#   - Creates the application data directory structure
#   - Downloads Astrometry.net index files (15-30 min on first run)
#
# What this script does NOT build:
#   - The local celestial catalog (data/local-catalog/celestial.sqlite). It is
#     built out-of-band, AFTER the first deploy has pulled an image, via
#     rebuild-catalog.sh (detached) — deploys never build it. See deploy.md §3a.
#     This script just creates the mount directory.
#
# What this script does NOT do (handled by the pipeline):
#   - Pull or run Docker images
#   - Write runtime config (.env, compose.yaml)
#   - Deploy the application
#
# Usage (on the remote server as root):
#   DEPLOY_USER="deploy" APP_DIR="/opt/astrosolve" ./1_server_init.sh
#
# Optional environment variables:
#   DEPLOY_USER — Non-root user for running the app (default: deploy)
#   APP_DIR     — Application data directory (default: /opt/astrosolve)
# =============================================================================

set -euo pipefail

# =============================================================================
# STEP 1: PRE-FLIGHT CHECKS
# =============================================================================

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root on the server." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${APP_DIR:-/opt/astrosolve}"
: "${DEPLOY_USER:=deploy}"

for required_script in 1a_init_docker.sh init-astrometry-db.sh; do
  if [ ! -f "$SCRIPT_DIR/$required_script" ]; then
    echo "Missing required script: $SCRIPT_DIR/$required_script" >&2
    exit 1
  fi
done

echo "=========================================="
echo "  ASTROSOLVE SERVER INIT"
echo "=========================================="

# =============================================================================
# STEP 2: INSTALL DOCKER
# =============================================================================

echo ""
echo "--- Docker Installation ---"
source "$SCRIPT_DIR/1a_init_docker.sh"

# =============================================================================
# STEP 3: CREATE DEPLOY USER
# =============================================================================

echo ""
echo "--- User Setup ---"

echo "==> Creating deploy user: $DEPLOY_USER"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

usermod -aG sudo "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

echo "==> Setting up SSH keys for $DEPLOY_USER"
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# =============================================================================
# STEP 4: CREATE DIRECTORY STRUCTURE
# =============================================================================

echo ""
echo "--- Directory Setup ---"

echo "==> Creating application directories under $TARGET_DIR"
mkdir -p "$TARGET_DIR/data/astrometry"
mkdir -p "$TARGET_DIR/data/local-catalog"
mkdir -p "$TARGET_DIR/data/uploads"
# Pre-create the SQLite file so Docker mounts it as a file, not a directory.
touch "$TARGET_DIR/data/astrosolve.sqlite"

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR"

# =============================================================================
# STEP 5: DOWNLOAD ASTROMETRY INDEX FILES
# =============================================================================

echo ""
echo "--- Astrometry Index Files ---"

bash "$SCRIPT_DIR/init-astrometry-db.sh" "$TARGET_DIR/data/astrometry"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR/data/astrometry"

# =============================================================================
# DONE
# =============================================================================

echo ""
echo "=========================================="
echo "  SERVER INIT COMPLETE"
echo "=========================================="
echo ""
echo "Data directory : $TARGET_DIR"
echo "Deploy user    : $DEPLOY_USER"
echo ""
echo "Next steps:"
echo "  1. Add GitHub Actions secrets (DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY)"
echo "  2. Add GitHub Actions variables (APP_DIR, ASTROSOLVE_ORIGIN)"
echo "  3. Point Cloudflare DNS A record to this server IP"
echo "  4. Trigger a deploy from GitHub Actions (pulls the image, starts the API"
echo "     catalog-less — fast pull + container swap)"
echo "  5. Build the catalog once it has an image, detached (deploy.md §3a):"
echo "       /opt/astrosolve/scripts/rebuild-catalog.sh   # ~20-40 min, survives SSH drops"
echo "     then: docker restart astrosolve"
echo ""
echo "Deploys never build the catalog — they just pull + swap the container, so"
echo "they stay fast. Refresh the catalog out-of-band with rebuild-catalog.sh."
echo ""
