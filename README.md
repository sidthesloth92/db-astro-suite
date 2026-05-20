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

The suite is designed to be deployed to **GitHub Pages** using a sub-path strategy:

- **Root**: `.../db-astro-suite/` (Hub)
- **Starwizz**: `.../db-astro-suite/starwizz/`

Deployment is handled via a unified GitHub Action (see Implementation Plan for details).
