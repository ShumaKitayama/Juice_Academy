# Repository Guidelines

## Project Structure & Module Organization

- `backend/` (Go 1.23) contains HTTP handlers in `controllers/`, business logic in `services/`, database helpers in `db/`, and auth middleware in `middleware/`.
- `frontend/` (Vite + React + TypeScript) is rooted at `src/main.tsx`; UI lives in `src/components/`, route screens in `src/pages/`, and API adapters in `src/services/`.
- Root-level ops assets include `docker-compose*.yml` and `mongo-init/`; build outputs such as `frontend/dist/` and `logs/` are disposable.

## Build, Test, and Development Commands

- `docker-compose up --build` rebuilds images and launches MongoDB, the Go API, and the proxied frontend.
- `cd frontend && npm install` sets up UI dependencies; `npm run dev` serves Vite on localhost:5173.
- `cd backend && go run ./main.go` runs the API against your `MONGODB_URI` when debugging outside Docker.
- `cd backend && ./run_tests.sh [--coverage]` executes unit and integration suites; `cd frontend && npm run build` or `npm run lint` run them before you push.

## Coding Style & Naming Conventions

- Go code must stay `go fmt`/`goimports` clean; packages are lowercase, exported handlers and services use PascalCase.
- Mirror existing naming (`*_simple.go`, `*_integration.go`) when adding controllers or tests, and prefer table-driven cases for new service logic.
- Frontend TypeScript uses 2-space indents, single quotes, PascalCase component files, and `useX` naming for hooks; follow `frontend/eslint.config.js` instead of adding disables.

## Testing Guidelines

- Place `_test.go` files beside source and keep `TestXxx` naming so `go test` discovers them automatically.
- `./run_tests.sh` needs Docker because it provisions the `mongodb-test` container and cleans it up; add `--coverage` to emit `coverage.html`.
- For quick loops target packages with `go test ./middleware -run TestName`; document manual frontend verification in PRs until UI tests are introduced.

## Commit & Pull Request Guidelines

- Use the conventional prefixes seen in history (`feat:`, `fix:`, `chore:`) with ≤72-character imperative subjects and scoped commits.
- Break work into cohesive commits and ensure `./run_tests.sh`, `npm run lint`, and `npm run build` pass locally.
- PR descriptions should outline the change, reference issues, list verification steps, and attach screenshots or gifs for UI updates before requesting review.

## Environment & Configuration Notes

- Keep secrets in local `.env` files or CI vaults; never commit credentials and update templates when variables change.
- Sync schema updates with the scripts in `mongo-init/` and mention required reruns during review.
- Validate deployment with `docker-compose -f docker-compose.prod.yml up`; Cloudflare Tunnel handles SSL and routing in production.
