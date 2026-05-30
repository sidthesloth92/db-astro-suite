#!/usr/bin/env bash

# =============================================================================
# 2_sync_catalog.sh — Upload the local celestial catalog to the VPS
# =============================================================================
# Builds nothing. Transfers the locally-built `celestial.sqlite` (produced by
# `npm run init-local-catalog-db` on your Mac) to the server's host-mounted
# catalog volume via rsync, so the server never has to download Gaia itself.
#
# Run this from your Mac, at the repo root, AFTER building the catalog locally.
#
# Use when:
#   - First deep-search deploy (seed the catalog before the new image runs)
#   - Refreshing the catalog later (re-run after rebuilding it locally)
#
# Required environment variables (same as deploy.md "Fill These Values First"):
#   SERVER_IP    — server public IP / host
#   SSH_KEY      — path to the SSH private key
#   DEPLOY_USER  — non-root deploy user (default: deploy)
#   APP_DIR      — application data directory on the server (default: /opt/astrosolve)
#
# After this completes, apply it by deploying (merge the PR / run the pipeline)
# or, if the new mount-aware image is already running, restart the container
# (3_restart.sh) so it reopens the new catalog file.
# =============================================================================

set -euo pipefail

: "${SERVER_IP:?Set SERVER_IP (e.g. export SERVER_IP=1.2.3.4)}"
: "${SSH_KEY:?Set SSH_KEY (e.g. export SSH_KEY=~/.ssh/db_astro_suite)}"
: "${DEPLOY_USER:=deploy}"
: "${APP_DIR:=/opt/astrosolve}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/deploy -> server root is two levels up.
LOCAL_CATALOG="$SCRIPT_DIR/../../data/local-catalog/celestial.sqlite"
REMOTE_DIR="$APP_DIR/data/local-catalog"

if [ ! -f "$LOCAL_CATALOG" ]; then
  echo "Local catalog not found: $LOCAL_CATALOG" >&2
  echo "Build it first:  (cd tools/astrosolve/server && npm run init-local-catalog-db)" >&2
  exit 1
fi

SIZE="$(du -h "$LOCAL_CATALOG" | cut -f1)"
echo "=========================================="
echo "  SYNC LOCAL CATALOG -> VPS"
echo "=========================================="
echo "Local : $LOCAL_CATALOG ($SIZE)"
echo "Remote: ${DEPLOY_USER}@${SERVER_IP}:${REMOTE_DIR}/celestial.sqlite"
echo ""

# Ensure the remote directory exists and is owned by the deploy user.
ssh -i "$SSH_KEY" "${DEPLOY_USER}@${SERVER_IP}" "mkdir -p '$REMOTE_DIR'"

# rsync with resume + progress. -z compresses on the wire; SQLite compresses
# poorly but the saving on sparse/zeroed pages is still worth it. --partial lets
# an interrupted transfer of the multi-GB file resume instead of restarting.
echo "==> Transferring (resumable; safe to re-run if interrupted)..."
rsync -avz --partial --progress \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_CATALOG" \
  "${DEPLOY_USER}@${SERVER_IP}:${REMOTE_DIR}/celestial.sqlite"

echo ""
echo "==> Verifying the uploaded catalog on the server..."
ssh -i "$SSH_KEY" "${DEPLOY_USER}@${SERVER_IP}" \
  "ls -lh '$REMOTE_DIR/celestial.sqlite'"

echo ""
echo "=========================================="
echo "  CATALOG SYNC COMPLETE"
echo "=========================================="
echo ""
echo "Next: deploy the app (merge the PR / run the pipeline). The container"
echo "mounts $REMOTE_DIR and will read this catalog on startup."
echo "If the mount-aware image is already running, restart it: 3_restart.sh"
echo ""
