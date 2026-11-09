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

The `/api/users` routes require a signed-in caller. BenchKit expects to run behind [Azure App Service Authentication](https://learn.microsoft.com/azure/app-service/overview-authentication-authorization) (Easy Auth), which signs users in with Entra ID and sets the `X-MS-CLIENT-PRINCIPAL-ID` / `X-MS-CLIENT-PRINCIPAL-NAME` request headers. The caller is the user whose `azureId` matches the principal id (or, for users with no `azureId`, whose `email` matches the principal name). Do not expose the app without Easy Auth or an equivalent proxy that strips client-supplied copies of these headers.

Admins get the full user directory and can create, update and delete users; other users only see each user's `_id` and `name`.

## Tech Stack

Nuxt 4, Vue 3, TypeScript, MongoDB / Mongoose, Nuxt UI, Tailwind CSS

## License

[MIT](LICENSE)
