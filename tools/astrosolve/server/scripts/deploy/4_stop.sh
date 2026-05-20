#!/usr/bin/env bash

# =============================================================================
# 4_stop.sh — Stop Astrosolve Container
# =============================================================================
# Gracefully stops and removes the running container.
# Data volumes (astrometry, uploads, astrosolve.sqlite) are preserved.
#
# To resume, trigger a deploy from GitHub Actions (workflow_dispatch).
# =============================================================================

set -euo pipefail

echo "==> Stopping astrosolve container"
docker stop astrosolve || true
docker rm astrosolve || true

echo "==> Container stopped and removed. Data volumes preserved."
