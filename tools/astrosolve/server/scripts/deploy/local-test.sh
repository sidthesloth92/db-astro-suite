#!/usr/bin/env bash

# =============================================================================
# local-test.sh — Automated Local Test Runner (OrbStack)
# =============================================================================
# Spins up an OrbStack Ubuntu VM, builds the backend image, and runs the full
# deploy pipeline (init + docker run) so the bootstrap scripts can be validated
# locally before touching the real server.
#
# Prerequisites:
#   - OrbStack installed (brew install --cask orbstack)
#   - Docker Desktop running on the Mac
#
# Usage:
#   bash tools/astrosolve/server/scripts/deploy/local-test.sh
#
# Override variables:
#   VM_NAME            Name of the OrbStack VM         (default: astrosolve-test)
#   IMAGE_TAG          Tag used for the local image     (default: test)
#   ASTROSOLVE_ORIGIN  CORS origin                      (default: http://localhost:4201)
#   DEPLOY_USER        Non-root deploy user             (default: deploy)
#   APP_DIR            Application data directory       (default: /opt/astrosolve)
# =============================================================================

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ────────────────────────────────────────────────────────────────────
VM_NAME="${VM_NAME:-astrosolve-test}"
IMAGE_TAG="${IMAGE_TAG:-test}"
LOCAL_IMAGE="astrosolve"

DEPLOY_DIR="/opt/astrosolve/scripts"
APP_DIR="${APP_DIR:-/opt/astrosolve}"
ASTROSOLVE_ORIGIN="${ASTROSOLVE_ORIGIN:-http://localhost:4201}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# ── Step 1: Build backend Docker image ────────────────────────────────────────
echo "==> [1/6] Building backend image..."
docker build -t "${LOCAL_IMAGE}:${IMAGE_TAG}" "$SERVER_DIR"

# ── Step 2: Create OrbStack VM ────────────────────────────────────────────────
echo "==> [2/6] Preparing OrbStack VM '${VM_NAME}'..."
if orb list 2>/dev/null | grep -q "^${VM_NAME}"; then
  echo "    VM already exists, reusing it."
else
  orb create ubuntu:24.04 "$VM_NAME"
fi

# ── Step 3: Transfer init scripts into VM ─────────────────────────────────────
echo "==> [3/6] Transferring init scripts..."
orb run -m "$VM_NAME" -u root mkdir -p "$DEPLOY_DIR"
tar -cf - \
  -C "$SCRIPT_DIR" \
  1_server_init.sh \
  1a_init_docker.sh \
  | orb run -m "$VM_NAME" -u root tar -xf - -C "$DEPLOY_DIR"

# init-astrometry-db.sh lives in scripts/data/ but must sit alongside
# 1_server_init.sh so the init script can find it as $SCRIPT_DIR/init-astrometry-db.sh.
tar -cf - \
  -C "$SCRIPT_DIR/../../scripts/data" \
  init-astrometry-db.sh \
  | orb run -m "$VM_NAME" -u root tar -xf - -C "$DEPLOY_DIR"

# ── Step 4: Run bootstrap (1_server_init.sh) ──────────────────────────────────
echo "==> [4/6] Running server bootstrap inside VM..."
orb run -m "$VM_NAME" sudo bash -c "
  chmod +x ${DEPLOY_DIR}/*.sh
  DEPLOY_USER='${DEPLOY_USER}' \
  APP_DIR='${APP_DIR}' \
  ${DEPLOY_DIR}/1_server_init.sh
"

# ── Step 5: Load image into VM ────────────────────────────────────────────────
echo "==> [5/6] Loading image into VM..."
docker save "${LOCAL_IMAGE}:${IMAGE_TAG}" | orb run -m "$VM_NAME" -u root docker load

# ── Step 6: Run container (mirrors production pipeline) ───────────────────────
echo "==> [6/6] Starting container..."
orb run -m "$VM_NAME" sudo -u "$DEPLOY_USER" bash -c "
  docker stop astrosolve || true
  docker rm astrosolve || true
  docker run -d \
    --name astrosolve \
    --restart unless-stopped \
    -p 80:3000 \
    -v ${APP_DIR}/data/astrometry:/usr/src/app/data/astrometry:ro \
    -v ${APP_DIR}/data/uploads:/usr/src/app/data/uploads \
    -v ${APP_DIR}/data/astrosolve.sqlite:/usr/src/app/data/astrosolve.sqlite \
    -e ASTROSOLVE_ORIGIN='${ASTROSOLVE_ORIGIN}' \
    -e NODE_ENV=production \
    -e TRUST_PROXY=true \
    ${LOCAL_IMAGE}:${IMAGE_TAG}
"

# ── Verify ────────────────────────────────────────────────────────────────────
echo ""
echo "--- Running containers ---"
orb run -m "$VM_NAME" sudo docker ps --filter name=astrosolve

VM_IP="$(orb list 2>/dev/null | awk -v vm="$VM_NAME" '$1 == vm {print $NF}')"

echo ""
echo "========================================"
echo " Local test complete!"
echo "========================================"
echo " VM IP         : ${VM_IP}"
echo " API base URL  : http://${VM_IP}"
echo ""
echo " Smoke test    : curl http://${VM_IP}/"
echo " Shell into VM : orb shell ${VM_NAME}"
echo " Clean up VM   : orb delete ${VM_NAME}"
echo "========================================="
