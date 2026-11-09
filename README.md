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

Every `/api/*` request must resolve to a BenchKit user, otherwise it gets `401`. User management (`POST/DELETE /api/users`, changing `role`, `email` or `azureId`) and `POST /api/seed` require `role: "admin"`; other users may only read and rename their own account. Cross-site writes (`Sec-Fetch-Site`/`Origin` from another site) get `403`.

| `NUXT_AUTH_MODE` | Caller identity                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `easyauth`       | Azure App Service authentication; `x-ms-client-principal-id` must equal the user's `azureId` (Entra object id). |
| `dev`            | `pnpm dev` only; every request acts as `NUXT_AUTH_DEV_USER_EMAIL`.                                              |

Bootstrap the first admin with `npx tsx scripts/seed.ts` (or set `azureId` on an existing admin directly in MongoDB).

## Tech Stack

Nuxt 4, Vue 3, TypeScript, MongoDB / Mongoose, Nuxt UI, Tailwind CSS

## License

[MIT](LICENSE)
