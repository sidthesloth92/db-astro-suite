# Astrosolve — Local Test Runbook (OrbStack)

Use [OrbStack](https://orbstack.dev) to spin up a lightweight Ubuntu VM on your Mac and
dry-run the deploy scripts before touching the real server. This mirrors the production
bootstrap exactly. OrbStack uses Apple's native Virtualization.framework — no QEMU
complexity, works on Apple Silicon out of the box.

> For the real server setup, see [deploy.md](deploy.md).

---

# OPTION A — Automated (Recommended)

Runs the entire pipeline in one command. No manual steps needed.

## Prerequisites

Install OrbStack if you haven't already:

```bash
brew install --cask orbstack
```

Open OrbStack once to complete its initial setup, then return to the terminal.

## Variables

All variables have defaults. Override only what you need:

| Variable            | Default                 | Description                             |
| ------------------- | ----------------------- | --------------------------------------- |
| `VM_NAME`           | `astrosolve-test`       | OrbStack VM name                        |
| `IMAGE_TAG`         | `test`                  | Docker image tag                        |
| `ASTROSOLVE_ORIGIN` | `http://localhost:4201` | CORS allowed origin (match your dev UI) |
| `DEPLOY_USER`       | `deploy`                | Non-root deploy user created in the VM  |
| `APP_DIR`           | `/opt/astrosolve`       | Application data directory              |

## Run

From the repo root:

```bash
bash tools/astrosolve/server/scripts/deploy/local-test.sh
```

To override a variable:

```bash
ASTROSOLVE_ORIGIN="http://localhost:4201" bash tools/astrosolve/server/scripts/deploy/local-test.sh
```

The script:

1. Builds the backend image locally
2. Creates an OrbStack Ubuntu 24.04 VM
3. Transfers the init scripts into the VM
4. Runs `1_server_init.sh` (Docker install, user, data directories, astrometry indexes)
5. Loads the image directly into the VM
6. Runs `docker run` with the same flags the pipeline uses in production

## Clean Up

```bash
orb delete astrosolve-test
```

---

# OPTION B — Manual (Step By Step)

Follow these steps when you want to run or debug individual stages in isolation.

## 0. Prerequisites

Set the variables you will use throughout:

```bash
export APP_DIR="/opt/astrosolve"
export ASTROSOLVE_ORIGIN="http://localhost:4201"
export DEPLOY_USER="deploy"
export IMAGE_TAG="test"
export LOCAL_IMAGE="astrosolve"
```

## 1. Install OrbStack

```bash
brew install --cask orbstack
```

Open OrbStack once to complete the initial setup, then return to the terminal.

## 2. Create A VM

```bash
orb create ubuntu:24.04 astrosolve-test
```

## 3. Build The Image

From the repo root:

```bash
docker build -t ${LOCAL_IMAGE}:${IMAGE_TAG} tools/astrosolve/server
```

## 4. Transfer Init Scripts Into The VM

```bash
DEPLOY_DIR="/root/astrosolve-deploy"
orb run -m astrosolve-test -u root mkdir -p "$DEPLOY_DIR"
tar -cf - \
  -C tools/astrosolve/server/scripts/deploy \
  1_server_init.sh 1a_init_docker.sh \
  | orb run -m astrosolve-test -u root tar -xf - -C "$DEPLOY_DIR"
tar -cf - \
  -C tools/astrosolve/server/scripts/data \
  init-astrometry-db.sh \
  | orb run -m astrosolve-test -u root tar -xf - -C "$DEPLOY_DIR"
```

## 5. Run Init Inside The VM

```bash
orb run -m astrosolve-test sudo bash -c "
  chmod +x /root/astrosolve-deploy/*.sh
  DEPLOY_USER='${DEPLOY_USER}' \
  APP_DIR='${APP_DIR}' \
  /root/astrosolve-deploy/1_server_init.sh
"
```

Verify key artifacts:

```bash
orb run -m astrosolve-test sudo ls -la ${APP_DIR}/data/
orb run -m astrosolve-test id ${DEPLOY_USER}
```

## 6. Load Image Into The VM

```bash
docker save "${LOCAL_IMAGE}:${IMAGE_TAG}" | orb run -m astrosolve-test -u root docker load
```

## 7. Run The Container

```bash
orb run -m astrosolve-test sudo -u "$DEPLOY_USER" bash -c "
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
```

## 8. Smoke Test

```bash
VM_IP="$(orb list 2>/dev/null | awk -v vm=astrosolve-test '$1 == vm {print $NF}')"
curl http://${VM_IP}/
```

Expected: `{"status":"Astrosolve API is running"}`

## 9. Test Restart And Stop

```bash
# Restart
orb run -m astrosolve-test sudo -u "$DEPLOY_USER" docker restart astrosolve

# Stop
orb run -m astrosolve-test sudo -u "$DEPLOY_USER" bash -c "docker stop astrosolve && docker rm astrosolve"
```

## 10. Clean Up

```bash
orb delete astrosolve-test
```
