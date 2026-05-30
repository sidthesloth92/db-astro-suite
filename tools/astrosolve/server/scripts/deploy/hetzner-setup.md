# Hetzner Server Setup Guide

This guide covers everything you need to create and configure in Hetzner Cloud Console **before** running the deploy scripts. Follow the steps in order.

---

## Phase 1 — Create Resources in Hetzner Cloud Console

### Step 1.1 — Create a Project

1. Go to [https://console.hetzner.cloud](https://console.hetzner.cloud)
2. Click **+ New project**
3. Name it (e.g. `db-astro-suite`)
4. Click **Add project**

---

### Step 1.2 — Generate an SSH Key Pair (on your Mac)

You need a key pair to authenticate with the server. Skip this if you already have one you want to reuse.

```bash
ssh-keygen -t ed25519 -C "db-astro-suite-hetzner" -f ~/.ssh/hertzner_db_astro_suite
```

This creates two files:

- `~/.ssh/hertzner_db_astro_suite` — **private key** (never share this)
- `~/.ssh/hertzner_db_astro_suite.pub` — **public key** (uploaded to Hetzner)

Print the public key so you can paste it:

```bash
cat ~/.ssh/hertzner_db_astro_suite.pub
```

---

### Step 1.3 — Add the SSH Key to Hetzner

1. Inside your project, go to **Security → SSH Keys**
2. Click **Add SSH key**
3. Paste the contents of `~/.ssh/hertzner_db_astro_suite.pub`
4. Give it a name (e.g. `macbook-deploy`)
5. Click **Add SSH key**

---

### Step 1.4 — Create a Server

1. Inside your project, click **Servers → Add server**
2. Fill in:

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| **Location**   | Pick the region closest to your users (e.g. `Ashburn, VA` for US East)      |
| **Image**      | `Ubuntu 24.04`                                                              |
| **Type**       | `Shared CPU → x86 → CX22` (2 vCPU, 4 GB RAM) — sufficient for this workload |
| **Networking** | Leave defaults (public IPv4 + IPv6 enabled)                                 |
| **SSH keys**   | Select the key you added in Step 1.3                                        |
| **Name**       | `astrosolve-prod` (or anything you prefer)                                  |
| **Backups**    | Optional but recommended for production                                     |

3. Click **Create & buy now**
4. Wait ~30 seconds for the server to reach **Running** state
5. Copy the **Public IPv4** address — this is your `SERVER_IP`

> **Disk sizing.** Data lives on the server's local disk under `/opt/astrosolve/`. Budget for the astrometry index files (~5–10 GB) **and** the local celestial catalog (~8 GB incl. Gaia + R-tree, built on the server). Together that is ~13–18 GB; with the Docker image and uploads on top, the default CX22 disk (40 GB) is workable but provision a larger disk if you want comfortable headroom for the catalog build.

---

### Step 1.5 — (Optional) Set a Firewall

For tighter security, restrict inbound traffic:

1. Go to **Firewalls → Create firewall**
2. Add inbound rules:

| Protocol | Port | Source                        | Purpose                           |
| -------- | ---- | ----------------------------- | --------------------------------- |
| TCP      | 22   | Your IP only (or `0.0.0.0/0`) | SSH                               |
| TCP      | 80   | `0.0.0.0/0`                   | HTTP (Cloudflare proxy hits this) |

3. Assign the firewall to your `astrosolve-prod` server
4. Leave all outbound traffic allowed (Docker pulls, apt, astrometry downloads all need it)

> Port 443 is **not** needed on the server — Cloudflare terminates TLS and forwards plain HTTP to port 80.

---

## Phase 2 — Verify SSH Access

Before running any scripts, confirm you can reach the server:

```bash
export SERVER_IP="<paste your Public IPv4 here>"

ssh -i ~/.ssh/hertzner_db_astro_suite root@$SERVER_IP "echo connected"
```

Expected output: `connected`

If it times out, check the firewall allows port 22 from your IP.

---

## Phase 3 — Run the Deploy Scripts

Now switch to [deploy.md](deploy.md) and work through it from **Step 0** onwards.

As a quick reference, here is what each phase of that runbook does:

| deploy.md Step | What happens                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| **0**          | Export shell variables on your Mac                                                                          |
| **1**          | SCP the deploy scripts to the server                                                                        |
| **2**          | SSH into the server as root                                                                                 |
| **3**          | Run `1_server_init.sh` — installs Docker, creates the deploy user, downloads astrometry indexes (15–30 min) |
| **3a**         | _No manual step._ The deploy pipeline builds the ~8 GB local celestial catalog automatically before the API starts (deploy.md §3a) — first deploy downloads it (~20–40 min), later deploys skip it |
| **4**          | Reconnect as the `deploy` user to verify Docker works                                                       |
| **5**          | Configure Cloudflare DNS (see Phase 4 below)                                                                |
| **6**          | Add GitHub Actions secrets                                                                                  |
| **7**          | Trigger the first deploy via workflow_dispatch (builds the catalog, then starts the API)                    |
| **8**          | Smoke test the API endpoint                                                                                 |
| **9**          | Verify data directories and disk headroom                                                                   |

---

## Phase 4 — Configure Cloudflare (happens after Phase 3, Step 3)

Once the server is running and you have its IP:

1. Go to your Cloudflare dashboard and select your domain (`dbastrosuite.com`)
2. Go to **DNS → Records → Add record**
3. Fill in:

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| **Type**         | `A`                                     |
| **Name**         | `api`                                   |
| **IPv4 address** | Your `SERVER_IP`                        |
| **Proxy status** | **Proxied** (orange cloud — must be ON) |

4. Go to **SSL/TLS → Overview**
5. Set the encryption mode to **Full (strict)**

> **Why Full (strict)?** Cloudflare proxies all traffic and terminates HTTPS. It then forwards plain HTTP to the server on port 80. Full (strict) ensures Cloudflare only connects if the origin has a valid certificate — Docker serves on port 80 without a cert, which is safe because Cloudflare handles the public-facing TLS.

---

## Phase 5 — Add GitHub Actions Secrets And Variables

Required for automated deploys on PR merge or `workflow_dispatch`.

1. Go to your GitHub repository → **Settings → Secrets and variables → Actions**

**Secrets tab** — add these:

| Secret name      | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| `DEPLOY_HOST`    | Your server's Public IPv4 (`SERVER_IP`)                         |
| `DEPLOY_USER`    | `deploy` (or whatever you set as `DEPLOY_USER`)                 |
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/db_astro_suite_ci` (the CI **private** key) |

To print the CI private key for copying:

```bash
cat ~/.ssh/db_astro_suite_ci
```

Copy the entire output including the `-----BEGIN...` and `-----END...` lines.

---

## Summary Checklist

Use this to track your progress end-to-end:

- [ ] Hetzner project created
- [ ] SSH key pair generated on your Mac
- [ ] CI SSH key pair generated (no passphrase) for GitHub Actions
- [ ] SSH public keys added to Hetzner
- [ ] Server created (Ubuntu 24.04, CX22 or larger)
- [ ] Server IP noted as `SERVER_IP`
- [ ] (Optional) Firewall created and assigned
- [ ] SSH access verified (`ssh root@$SERVER_IP`)
- [ ] Init scripts copied to server
- [ ] `1_server_init.sh` completed (Docker, user, astrometry indexes)
- [ ] Deploy user SSH access verified
- [ ] Cloudflare A record created and proxied
- [ ] Cloudflare SSL set to Full (strict)
- [ ] GitHub Actions secrets added (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`)
- [ ] First deploy triggered via workflow_dispatch and succeeded (builds the catalog, ~20–40 min, then starts the API)
- [ ] Catalog present after deploy — `data/local-catalog/celestial.sqlite` exists on the server
- [ ] API smoke test passed (`curl https://api.dbastrosuite.com/`)
