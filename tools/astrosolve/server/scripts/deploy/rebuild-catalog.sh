#!/usr/bin/env bash

# =============================================================================
# rebuild-catalog.sh — (re)build the local celestial catalog, out-of-band
# =============================================================================
# Builds data/local-catalog/celestial.sqlite (OpenNGC + HyperLEDA + Milliquas +
# faint nebulae/clusters + Gaia DR3 G≤15 + R-tree) on the server, DETACHED so an
# SSH disconnect can't interrupt it. The build is resumable — re-running skips
# already-loaded sources; pass --rebuild to force a clean rebuild.
#
# Why this is separate from a deploy: the build is slow (a full R-tree rebuild
# over ~38M rows). Deploys therefore do NOT build the catalog — they just pull
# the image and swap the container (~seconds). This script is the deliberate,
# out-of-band build you run for first-time setup and the occasional refresh.
#
# Usage (on the server, as the deploy user):
#   ./rebuild-catalog.sh              # resumable build (skips loaded sources)
#   ./rebuild-catalog.sh --rebuild    # wipe and rebuild from scratch
#
# Optional environment variables:
#   APP_DIR — application data directory (default: /opt/astrosolve)
#   IMAGE   — astrosolve image tag (default: latest pulled astrosolve image)
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/astrosolve}"

# Default IMAGE to the most recently pulled astrosolve image. On a brand-new
# server no image exists until the first deploy pulls one — the catalog build
# reuses that image.
if [ -z "${IMAGE:-}" ]; then
  IMAGE="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep astrosolve | head -1 || true)"
fi

if [ -z "$IMAGE" ]; then
  echo "No astrosolve image found locally." >&2
  echo "Run a deploy first (it pulls the image), then re-run this script." >&2
  exit 1
fi

# A previous build container left behind (finished or interrupted) would block
# the fixed name; clear it so this run starts clean.
docker rm -f catalog-build >/dev/null 2>&1 || true

echo "=========================================="
echo "  ASTROSOLVE CATALOG (RE)BUILD"
echo "=========================================="
echo "Image   : $IMAGE"
echo "Data dir: $APP_DIR/data/local-catalog"
echo "Args    : ${*:-<none> (resumable)}"
echo ""

# Build the npm command, forwarding any args (e.g. --rebuild) through npm's `--`.
RUN_CMD=(npm run init-local-catalog-db)
if [ "$#" -gt 0 ]; then
  RUN_CMD+=(-- "$@")
fi

# Detached: survives an SSH disconnect. The init script writes into the mounted
# host volume; the running API (if any) keeps serving until you restart it.
docker run -d --name catalog-build \
  -v "$APP_DIR/data/local-catalog:/usr/src/app/data/local-catalog" \
  "$IMAGE" \
  "${RUN_CMD[@]}"

echo "Catalog build started (detached) as container 'catalog-build'."
echo ""
echo "Watch progress (safe to Ctrl-C / disconnect — the build keeps running):"
echo "  docker logs -f catalog-build"
echo ""
echo "When you see 'R-tree spatial index built (...)', let the API pick up the"
echo "new catalog by restarting it:"
echo "  docker restart astrosolve"
echo ""
echo "(On a first-time build the API is serving catalog-less until that restart."
echo " For a refresh on a live server, the API's catalog lookups may briefly"
echo " error during the R-tree step — stop it first if you want zero blips.)"
