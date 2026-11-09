# BenchKit

A toolkit for creating ground truth datasets and benchmarking generative AI systems in enterprise contexts. Read the [paper](paper/paper.pdf) for the full methodology.

<img width="49%" alt="BenchKit-manage" src="https://github.com/user-attachments/assets/6ab98f91-6de5-4068-b477-85b5a7760f2d" />
<img width="49%" alt="BenchKit-review" src="https://github.com/user-attachments/assets/2b412660-a450-499b-bc9a-cbe33b0dcebe" />

## Paper

BenchKit implements the benchmarking workflow described in _Benchmarking Workflow for Generative AI Systems_ — an end-to-end pipeline covering ground truth generation, performance benchmarking with statistical validation, and continuous monitoring. See [`paper/paper.pdf`](paper/paper.pdf) for details.

## Features

- **Manage** — CRUD for users, projects, and test cases with multi-file upload (PDF, image, JSON, text)
- **Review** — Validation UI with keyboard navigation, progress tracking, and annotation notes
- **Analyse** — Benchmark comparison with field-level diff via jsondiffpatch

## Quick Start

Prerequisites: Node 18+, pnpm, MongoDB

```bash
pnpm install
cp .env.example .env
pnpm dev
```

This starts MongoDB on port 27017 and Nuxt on `http://localhost:3000`.

If MongoDB is running elsewhere, update `MONGODB_URI` in `.env` and run:

```bash
pnpm dev:standalone
```

## Authentication

Creating, editing and deleting users requires an authenticated `admin`. The server resolves the caller from the `X-MS-CLIENT-PRINCIPAL-ID` header set by [Azure App Service Authentication](https://learn.microsoft.com/azure/app-service/overview-authentication-authorization) and matches it against `User.azureId`. Header trust is off by default; set `NUXT_AUTH_TRUST_APP_SERVICE_HEADERS=true` only when the app is deployed behind App Service Authentication. Without it these requests return `401`, and non-admin callers get `403`.

Create the first admin directly in MongoDB (or with `scripts/seed.ts`) with `azureId` set to their Entra ID object id.

## Tech Stack

Nuxt 4, Vue 3, TypeScript, MongoDB / Mongoose, Nuxt UI, Tailwind CSS

## License

[MIT](LICENSE)
