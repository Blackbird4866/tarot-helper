# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Unified Cloudflare Worker deployment** — a single Worker (`tarot-helper`) now serves both the React SPA and the `/api/*` routes.
- **Static assets in Worker** — `worker/wrangler.toml` configures `frontend/app/dist` with SPA fallback (`not_found_handling = "single-page-application"`) and routes `/api/*` to the Worker script first (`run_worker_first`).
- **Worker tooling** — `worker/package.json` pins Wrangler (`^4.20.0`) and adds `npm run dev` / `npm run deploy` scripts.
- **GitHub Actions CI/CD** — `.github/workflows/deploy.yml` with two jobs:
  - `test` — runs `npm test` in `frontend/app`
  - `deploy` — builds the frontend and runs `wrangler deploy` from `worker/` (only after tests pass)
- **Workflow triggers** — pipeline runs automatically on push to `main`, or manually via **Actions → Deploy → Run workflow** (`workflow_dispatch`).

### Changed

- **Worker name** — renamed from `tarot-helper-api` to `tarot-helper` to reflect the unified app.
- **Deployment architecture** — replaced the previous Cloudflare Pages + separate Worker setup with a single Worker deploy target.
- **API routing** — frontend uses same-origin `/api/readings` by default; `VITE_API_BASE_URL` is no longer required for production.
- **README** — updated architecture diagram, local dev instructions, manual deploy steps, and CI/CD setup guide.
- **`.gitignore`** — added `worker/node_modules/`.

### Removed

- **Cloudflare Pages deployment path** — frontend is no longer deployed as a separate Pages project.
- **PR-triggered CI** — the deploy workflow no longer runs on pull requests (only push to `main` and manual dispatch).

### Migration

If you previously deployed with the old setup:

1. Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
2. Ensure `DEEPSEEK_API_KEY` is set on the new Worker:
   ```bash
   cd worker
   npm install
   npx wrangler secret put DEEPSEEK_API_KEY
   ```
3. Push to `main` or trigger the workflow manually to deploy.
4. Verify: `curl https://tarot-helper.<your-account>.workers.dev/api/health`
5. Optionally delete the old `tarot-helper-api` Worker and any Cloudflare Pages project from the Cloudflare dashboard.

## [0.1.0] - 2026-06-13

### Added

- Initial tarot reading assistant (Vite + React + TypeScript frontend).
- Cloudflare Worker API (`GET /api/health`, `POST /api/readings`) with DeepSeek integration.
- Tarot deck data, spreads, card drawing, and reading payload utilities.
- Frontend unit tests for data and reading logic.
