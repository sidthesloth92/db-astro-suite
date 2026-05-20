#!/usr/bin/env bash

# =============================================================================
# 3_restart.sh — Restart Astrosolve Container
# =============================================================================
# Restarts the running container without pulling a new image.
#
# Use when:
#   - The container is misbehaving or entered an unhealthy state
#   - You need a clean restart after a transient error
#
# Use the pipeline (workflow_dispatch) instead when you want to deploy
# a new image version.
# =============================================================================

set -euo pipefail

echo "==> Restarting astrosolve container"
docker restart astrosolve

echo ""
echo "==> Restart complete"
docker ps --filter name=astrosolve --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
