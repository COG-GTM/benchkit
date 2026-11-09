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

Every `/api/*` route requires an authenticated BenchKit user and returns `401` otherwise. The caller is resolved from the `X-MS-CLIENT-PRINCIPAL-ID` / `X-MS-CLIENT-PRINCIPAL-NAME` headers set by Azure App Service Authentication (Easy Auth), matched against `User.azureId` (or `User.email` for users without an `azureId`). Easy Auth must be enabled in front of any deployment, since it is what strips client-supplied copies of these headers.

- Projects can only be updated (`PATCH /api/projects/:id`) or deleted (`DELETE /api/projects/:id`) by their owner or an admin; only `name`, `description`, `owner` and `members` are editable.
- Creating, editing or deleting users and running `POST /api/seed` require the `admin` role.

For local development, set `BENCHKIT_DEV_USER_EMAIL` in `.env` to the email of an existing user (e.g. `admin@example.com` after running `pnpm tsx scripts/seed.ts`). It is only honoured by `nuxt dev`, never in production builds.

## Tech Stack

Nuxt 4, Vue 3, TypeScript, MongoDB / Mongoose, Nuxt UI, Tailwind CSS

## License

[MIT](LICENSE)
