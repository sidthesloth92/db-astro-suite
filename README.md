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

---

## 📜 License

DB Astro Suite is free software, licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only) with a few additional terms in [NOTICE](NOTICE).

In plain words (the [LICENSE](LICENSE) and [NOTICE](NOTICE) files are what legally apply):

- **Use it for free.** Anyone can use, study, change and share the tools.
- **Credit DB Astro Suite.** Any copy or modified version with a user interface must keep a visible "DB Astro Suite" credit linked to [dbastrosuite.com](https://dbastrosuite.com), like the "Part of DB Astro Suite" line under each tool's name. Command-line tools keep the name and address in their banner.
- **Share your changes.** If you distribute a modified version, or run one as a website or online service, you must offer its full source code to its users under the same license.
- **Use your own name.** Modified versions must not call themselves DB Astro Suite, Starwizz, Astrogram, AstroSpike, Astrosolve or Sortronomy, or present themselves as the official tools.
- **What you make is yours.** Images, videos, cards and other output you create with the tools are not covered by this license. Use them however you like, including commercially, with no credit required.

Need different terms, for example no attribution or closed source? [Open an issue](https://github.com/sidthesloth92/db-astro-suite/issues) to ask about a separate license.

Versions up to and including v1.42.0 were published under the MIT License. Third-party software and data used by the suite, including [Astrometry.net](https://astrometry.net) (GPL-3.0-or-later) for plate solving, are credited in [NOTICE](NOTICE).
