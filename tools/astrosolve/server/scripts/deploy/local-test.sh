#!/usr/bin/env bash

# =============================================================================
# local-test.sh — Automated Local Test Runner (OrbStack)
# =============================================================================
# Spins up an OrbStack Ubuntu VM, builds the backend image, serves it via a
# local Docker registry, and runs the full deploy pipeline (init + deploy) so
# the bootstrap scripts can be validated locally before touching the server.
#
# Prerequisites:
#   - OrbStack installed (brew install --cask orbstack)
#   - Docker Desktop running on the Mac
#
# Usage:
#   bash tools/astrosolve/server/scripts/deploy/local-test.sh
#
# Override variables:
#   VM_NAME        Name of the OrbStack VM         (default: astrosolve-test)
#   REGISTRY_PORT  Port for the local registry      (default: 5000)
#   IMAGE_TAG      Tag used for the local image     (default: astrosolve-image)
#   API_DOMAIN     Domain passed to init script     (default: api.test.local)
#   UI_ORIGIN      CORS origin passed to init       (default: http://localhost:4201)
#   DEPLOY_USER    Non-root deploy user             (default: deploy)
# =============================================================================

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ────────────────────────────────────────────────────────────────────
VM_NAME="${VM_NAME:-astrosolve-test}"
IMAGE_TAG="${IMAGE_TAG:-astrosolve-image}"
# No registry — the image is built on the Mac and loaded directly into the VM.
LOCAL_IMAGE="astrosolve"
GHCR_IMAGE="astrosolve"

DEPLOY_DIR="/root/astrosolve-deploy"
API_DOMAIN="${API_DOMAIN:-api.test.local}"      # label only — does not need to resolve
UI_ORIGIN="${UI_ORIGIN:-http://localhost:4201}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# ── Step 1: Build backend Docker image ────────────────────────────────────────
echo "==> [1/7] Building backend image..."
docker build -t "${LOCAL_IMAGE}:${IMAGE_TAG}" "$SERVER_DIR"

# ── Step 2: Create OrbStack VM ────────────────────────────────────────────────
echo "==> [2/7] Preparing OrbStack VM '${VM_NAME}'..."
if orb list 2>/dev/null | grep -q "^${VM_NAME}"; then
  echo "    VM already exists, reusing it."
else
  orb create ubuntu:24.04 "$VM_NAME"
fi

# ── Step 3: Transfer deploy scripts into VM ───────────────────────────────────
echo "==> [3/7] Transferring deploy scripts..."
orb run -m "$VM_NAME" -u root mkdir -p "$DEPLOY_DIR"
# Pipe a tar archive through orb run — no SSH key setup needed
tar -cf - \
  -C "$SCRIPT_DIR" \
  1_server_init.sh \
  1a_init_docker.sh \
  1b_init_compose.sh \
  2_deploy.sh \
  3_restart.sh \
  4_stop.sh \
  5_teardown.sh \
  | orb run -m "$VM_NAME" -u root tar -xf - -C "$DEPLOY_DIR"

# init-astrometry-db.sh lives in scripts/data/ in the repo but is copied
# flat into DEPLOY_DIR so 1_server_init.sh can reference it as $SCRIPT_DIR/init-astrometry-db.sh.
tar -cf - \
  -C "$SCRIPT_DIR/../../scripts/data" \
  init-astrometry-db.sh \
  | orb run -m "$VM_NAME" -u root tar -xf - -C "$DEPLOY_DIR"

# ── Step 4: Run bootstrap (1_server_init.sh) ──────────────────────────────────
echo "==> [4/7] Running server bootstrap inside VM..."
orb run -m "$VM_NAME" sudo bash -c "
  chmod +x ${DEPLOY_DIR}/*.sh
  API_DOMAIN='${API_DOMAIN}' \
  UI_ORIGIN='${UI_ORIGIN}' \
  GHCR_IMAGE='${GHCR_IMAGE}' \
  DEPLOY_USER='${DEPLOY_USER}' \
  ${DEPLOY_DIR}/1_server_init.sh
"

# ── Step 5: Load image into VM ────────────────────────────────────────────────
# Pipe docker save straight into docker load inside the VM — no registry, no
# port conflicts, no insecure-registry daemon config required.
echo "==> [5/7] Loading image into VM..."
docker save "${LOCAL_IMAGE}:${IMAGE_TAG}" | orb run -m "$VM_NAME" -u root docker load

# ── Step 6: Deploy using 2_deploy.sh (full production flow) ───────────────────
echo "==> [6/7] Running full deploy (2_deploy.sh)..."
# SKIP_PULL=1 tells 2_deploy.sh to skip 'docker pull' — the image was already
# loaded directly into the VM's Docker daemon in the previous step.
orb run -m "$VM_NAME" sudo -u "$DEPLOY_USER" bash -c \
  "SKIP_PULL=1 /opt/astrosolve/scripts/2_deploy.sh '${IMAGE_TAG}'"

# ── Step 7: Verify ────────────────────────────────────────────────────────────
echo "==> [7/7] Verifying deployment..."
echo ""
echo "--- .env ---"
orb run -m "$VM_NAME" sudo cat /opt/astrosolve/.env
echo ""
echo "--- compose.yaml ---"
orb run -m "$VM_NAME" sudo cat /opt/astrosolve/compose.yaml
echo ""
echo "--- Running containers ---"
orb run -m "$VM_NAME" sudo docker compose \
  --env-file /opt/astrosolve/.env \
  -f /opt/astrosolve/compose.yaml ps

echo ""
VM_IP="$(orb list 2>/dev/null | awk -v vm="$VM_NAME" '$1 == vm {print $NF}')"

echo "========================================"
echo " Local test complete!"
echo "========================================"
echo " VM IP         : ${VM_IP}"
echo " API base URL  : http://${VM_IP}"
echo ""
echo " To make the hostname browser-resolvable:"
echo "   echo \"${VM_IP}  ${VM_NAME}.orb.local\" | sudo tee -a /etc/hosts"
echo ""
echo " Open a shell : orb shell ${VM_NAME}"
echo " Clean up VM  : orb delete ${VM_NAME}"
echo "========================================="
