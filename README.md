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

Every `/api/**` route requires a signed-in user and returns `401` otherwise.

- **Production** — run behind Azure App Service Authentication (Easy Auth) and set `NUXT_AUTH_TRUST_EASY_AUTH=true`. The `X-MS-CLIENT-PRINCIPAL-ID` header is matched against `User.azureId`. Only enable this when the app cannot be reached except through Easy Auth.
- **Local development** — `NUXT_AUTH_DEV_USER_EMAIL` (set in `.env.example`) signs every request in as that user under `nuxt dev` and creates it as an admin if it does not exist. It is ignored in production builds.

New projects are always owned by the signed-in user.

## Tech Stack

Nuxt 4, Vue 3, TypeScript, MongoDB / Mongoose, Nuxt UI, Tailwind CSS

## License

[MIT](LICENSE)
