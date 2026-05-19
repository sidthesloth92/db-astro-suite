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

| Variable        | Default                 | Description                             |
| --------------- | ----------------------- | --------------------------------------- |
| `VM_NAME`       | `astrosolve-test`       | OrbStack VM name                        |
| `IMAGE_TAG`     | `astrosolve-image`      | Docker image tag                        |
| `REGISTRY_PORT` | `5000`                  | Local registry port on your Mac         |
| `API_DOMAIN`    | `api.test.local`        | Label only — does not need to resolve   |
| `UI_ORIGIN`     | `http://localhost:4201` | CORS allowed origin (match your dev UI) |
| `DEPLOY_USER`   | `deploy`                | Non-root deploy user created in the VM  |

## Run

From the repo root:

```bash
bash tools/astrosolve/server/scripts/deploy/local-test.sh
```

To override a variable:

```bash
UI_ORIGIN="http://localhost:4201" bash tools/astrosolve/server/scripts/deploy/local-test.sh
```

The script:

1. Starts a local Docker registry on your Mac (port 5000)
2. Builds the backend image and pushes it to the registry
3. Creates an OrbStack Ubuntu 24.04 VM
4. Transfers the deploy scripts into the VM
5. Runs `1_server_init.sh` (full bootstrap)
6. Configures the VM's Docker to trust the local registry
7. Runs `2_deploy.sh` (pull + start containers)
8. Prints a verification summary

## Clean Up (After Automated Run)

```bash
orb delete astrosolve-test
docker stop astrosolve-local-registry && docker rm astrosolve-local-registry
```

---

# OPTION B — Manual (Step By Step)

Follow these steps when you want to run or debug individual stages in isolation.

## 0. Prerequisites

Set the variables you will pass to the scripts:

```bash
export API_DOMAIN="api.test.local"   # not used for routing — just a label written into .env
export UI_ORIGIN="http://localhost:4201"
export DEPLOY_USER="deploy"
```

> **No GHCR image needed.** The manual steps below use a local Docker registry so
> `2_deploy.sh` can complete the full pull-based deploy flow without a real GHCR image.
> `GHCR_IMAGE` is derived from the local registry address and set automatically.
>
> **`API_DOMAIN`** is only written into `.env` as a label — it does not need to resolve
> during local testing. To call the API after deploy, use the VM's IP directly:
> `curl http://$(orb ip astrosolve-test)`

## 1. Install OrbStack

```bash
brew install --cask orbstack
```

Open OrbStack once to complete the initial setup, then return to the terminal.

## 2. Create A VM

```bash
orb create ubuntu:24.04 astrosolve-test
```

This provisions an Ubuntu 24.04 VM matching the production server OS.

## 3. Build And Serve The Image Locally

`2_deploy.sh` does an unconditional `docker pull` — it cannot use an image that only
exists in the Mac's Docker cache. The solution is a local registry on your Mac that
the VM can reach via `host.orb.internal` (OrbStack's built-in Mac hostname).

Start a local registry on your Mac:

```bash
docker run -d --name astrosolve-local-registry -p 5000:5000 registry:2
```

Build and push the image to it (from the repo root):

```bash
docker build -t localhost:5000/astrosolve:test tools/astrosolve/server
docker push localhost:5000/astrosolve:test
```

Set the image variable the init script will write into `.env`:

```bash
export GHCR_IMAGE="host.orb.internal:5000/astrosolve"
```

## 4. Transfer Scripts Into The VM

From your Mac, at the repo root:

```bash
DEPLOY_DIR="/root/astrosolve-deploy"
orb run -m astrosolve-test -u root mkdir -p "$DEPLOY_DIR"
tar -cf - \
  -C tools/astrosolve/server/scripts/deploy \
  1_server_init.sh 1a_init_docker.sh 1b_init_compose.sh \
  2_deploy.sh 3_restart.sh 4_stop.sh 5_teardown.sh \
  | orb run -m astrosolve-test -u root tar -xf - -C "$DEPLOY_DIR"
```

## 5. Run Init Inside The VM

```bash
orb shell -m astrosolve-test -u root

# Inside the VM:
chmod +x /root/astrosolve-deploy/*.sh
API_DOMAIN="$API_DOMAIN" \
UI_ORIGIN="$UI_ORIGIN" \
GHCR_IMAGE="$GHCR_IMAGE" \
DEPLOY_USER="$DEPLOY_USER" \
/root/astrosolve-deploy/1_server_init.sh
```

Verify key artifacts:

```bash
cat /opt/astrosolve/.env
cat /opt/astrosolve/compose.yaml
id deploy
ls /opt/astrosolve/scripts/
```

## 6. Allow The VM To Pull From The Local Registry

Docker inside the VM must be told to trust the unencrypted local registry at
`host.orb.internal:5000` (OrbStack exposes your Mac at this hostname):

```bash
orb run -m astrosolve-test sudo bash -c \
  'mkdir -p /etc/docker && echo \'{ "insecure-registries": ["host.orb.internal:5000"] }\' > /etc/docker/daemon.json && systemctl restart docker && sleep 3'
```

## 7. Test Deploy

No credentials needed — the image is served from your local registry:

```bash
/opt/astrosolve/scripts/2_deploy.sh test
```

## 8. Test Restart And Stop

```bash
/opt/astrosolve/scripts/3_restart.sh
/opt/astrosolve/scripts/4_stop.sh
```

## 9. Clean Up

When done, from your Mac:

```bash
# Delete the VM
orb delete astrosolve-test

# Stop and remove the local registry
docker stop astrosolve-local-registry && docker rm astrosolve-local-registry
```
