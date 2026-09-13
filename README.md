# DB Astro Suite 🚀

A professional, organizational-style monorepo containing a suite of Astro-based tools, Python services, and Go utilities. All packages are scoped under `@db-astro-suite/`.

---

## 🏗 Project Structure

```text
/db-astro-suite/
├── apps/               # Scoped as @db-astro-suite/*
│   ├── hub/            # Central landing page (Astro)
│   └── starwizz/       # Starfield generator (Angular - Migrated with history)
├── libs/               # Scoped as @db-astro-suite/*
│   └── ui/             # Shared UI components (Astro/TS)
├── services/           # Backend services (Python)
│   └── (coming soon)
└── tools/              # Multi-language CLI tools
    └── sortronomy/   # Platform-agnostic script generator (Go)
```

---

## 🔭 Tools

|  | Tool | What it does |
| --- | --- | --- |
| <img src="tools/sortronomy/assets/brand/sortronomy-mark.svg" width="28" alt="Sortronomy logo" /> | [Sortronomy](tools/sortronomy/) | Offline CLI wizard that sorts astrophotography FITS captures into a clean library — by camera, target, date, and filter, read straight from the headers. |

---

## 🚀 Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) (v8+)
- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://go.dev/) (for tools)
- [Python](https://www.python.org/) (for services)

### Installation

From the root directory, install all dependencies for all workspaces:

```bash
pnpm install
```

---

## 🛠 Usage

### Development Tasks

This monorepo uses `pnpm` workspaces to manage multiple projects. You can run commands specifically for one project using the `--filter` flag.

#### Run the Suite Hub (Landing Page)

```bash
pnpm --filter @db-astro-suite/hub dev
```

#### Run Starwizz

```bash
pnpm --filter @db-astro-suite/starwizz start
```

#### Run the Go Script Generator

```bash
cd tools/sortronomy
go run main.go [script-name]
```

### Shared UI Package

When you add components to `libs/ui`, they are immediately available to your apps. To build the shared package:

```bash
pnpm --filter @db-astro-suite/ui build
```

---

## 📦 Deployment

The suite deploys two independently hosted pieces on every release PR merge:

- **Frontend** — built and deployed to **GitHub Pages** via the `release-deploy` pipeline
- **Backend (Astrosolve)** — Docker image built and pushed to GHCR, then deployed to a **VPS** via SSH

### Server Setup (one-time)

Before the first deploy, the VPS must be bootstrapped manually. See:

- [`tools/astrosolve/server/scripts/deploy/hetzner-setup.md`](tools/astrosolve/server/scripts/deploy/hetzner-setup.md) — VPS setup and GitHub Actions secrets
- [`tools/astrosolve/server/scripts/deploy/deploy.md`](tools/astrosolve/server/scripts/deploy/deploy.md) — full deploy runbook

### Ongoing Deploys

Merging a release PR triggers the pipeline automatically. Manual deploys can also be triggered via **Actions → test-release-deploy → Run workflow**.

### Local Testing

To dry-run the deploy scripts against a local VM before touching production:

```bash
bash tools/astrosolve/server/scripts/deploy/local-test.sh
```

See [`tools/astrosolve/server/scripts/deploy/local-test.md`](tools/astrosolve/server/scripts/deploy/local-test.md) for details.
