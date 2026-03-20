# Architecture — Job Search HQ

## About This Document

This is the technical source of truth for system structure, data flow, persistence model, and key invariants.

Read this first when making code changes that touch state flow, auth gating, persistence, or deployment topology.

If another planning doc conflicts with this one, use this architecture doc plus current code as the tie-breaker.

## System Overview

Single-page React app (Vite) with an Express proxy forwarding API requests
to a self-hosted PocketBase instance.

```
Browser (React SPA)
  ↕ fetch
Express Proxy (server/index.js)
  ↕ proxy
PocketBase (Oracle Cloud ARM)
```

- Frontend deployed on Cloudflare Pages at `dashboard.michaelballin.com`
- PocketBase at `pocketbase.michaelballin.com` (Oracle Cloud ARM)
- API proxy at `api.dashboard.michaelballin.com` (Oracle Cloud ARM)
- Reverse proxy: Caddy

## Environment Model

| Environment | What lives there |
|---|---|
| Local machine | Day-to-day development tools: VS Code, Copilot, the Vite dev server, the local Express API process, local `.env` files, and optionally a local PocketBase instance for development. |
| GitHub | The source of truth for application code, server code, deployment templates, migration scripts, documentation, and non-secret config templates such as `.env.example` files. Secrets and live data do not belong here. |
| Oracle server | Production runtime services: Caddy, the Node API proxy, PocketBase, systemd units, runtime env files in `/etc/job-dashboard/`, and backup/restore infrastructure. This host should run deployed code, not act as the primary place where code or config is edited. |
| Cloudflare | Static frontend hosting on Cloudflare Pages and related edge delivery for the deployed SPA. Cloudflare serves the built frontend, while API and data stay on Oracle. |

In practice, development should happen locally, versioned changes should land in GitHub, Cloudflare should serve the frontend build, and Oracle should only run the deployed backend and data services.

## Oracle Cloud Instance — Server Infrastructure

This section records the production server topology at a glance. For step-by-step
operations, deployment, and restore procedures, use
`docs/ops/SERVER-RUNBOOK.md`.

### Services

| Service    | Runs as          | Listens on          | Service file                                      |
|------------|------------------|---------------------|---------------------------------------------------|
| PocketBase | systemd (root)   | `127.0.0.1:8090`    | `/lib/systemd/system/pocketbase.service`          |
| Node API   | systemd (ubuntu) | `127.0.0.1:3001`    | `/etc/systemd/system/job-dashboard-api.service`   |
| Caddy      | systemd (caddy)  | `0.0.0.0:80,443`    | `/lib/systemd/system/caddy.service`               |

### Key file paths

- **PocketBase binary + data:** `/opt/pocketbase/` (`pb_data/`, `pb_migrations/`, `std.log`)
- **Node API source:** `/home/ubuntu/dashboard/server/`
- **Caddy config:** `/etc/caddy/Caddyfile`
- **Node runtime:** `/home/ubuntu/.nvm/versions/node/v20.20.1/bin/node`

### Environment files

All project env files live in `/etc/job-dashboard/` with `chmod 600`:

- **`api.env`** — Node API proxy: `PB_URL`, `PORT`, `CORS_ALLOWED_ORIGINS`, `UPSTREAM_TIMEOUT_MS`
- **`pocketbase-backup.env`** — Backup timer: `PB_DATA_DIR`, `BACKUP_ROOT`, `RETENTION_DAYS`, `R2_ENDPOINT`, `R2_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

PocketBase has no env file. Config lives in the SQLite database; bind address
is defined in the service file `ExecStart`.

AWS CLI credentials for R2 are also at `~/.aws/credentials` (standard location,
duplicated from backup env file).

### Caddy routing

- `pocketbase.michaelballin.com` -> reverse proxy to `127.0.0.1:8090`
  - `/_/*` blocked with 403 (admin UI is SSH tunnel only)
  - `request_body` max 10MB
- `api.dashboard.michaelballin.com` -> reverse proxy to `localhost:3001`

### Admin access

PocketBase admin UI is blocked publicly by Caddy. Access via SSH tunnel:

```bash
ssh -L 8090:127.0.0.1:8090 dashboard
```

Then browse to `http://localhost:8090/_/` while the tunnel remains open.

### Backups

Daily systemd timer at 03:25 UTC. Local retention is 14 days at
`/var/backups/job-dashboard/pocketbase/daily/`. Off-site sync targets
Cloudflare R2 bucket `job-dashboard-backups`.

### Firewall

Two layers must both be configured for any port exposure:

1. OCI Security List (Oracle Cloud console)
2. `iptables` on the VM

## Centralized Hook Pattern

All app data flows through a single custom hook:

```
useAppData.js
  ├── Fetches all collections on mount (cards, tasks, notes, etc.)
  ├── Holds React state for every data domain
  ├── Exposes handler functions (addCard, updateTask, togglePin, etc.)
  └── Manages derived values (weekKey, filtered tasks, cumulative counters)
```

UI components receive data and handlers as props from App.jsx, which calls
useAppData. Components do not import pb.js directly.

## Component Responsibilities

| Component | Role |
|---|---|
| App.jsx | Auth gate, tab routing, passes useAppData state/handlers to children |
| AppHeader.jsx | Tab navigation, cumulative activity counters |
| DashboardTab.jsx | Composes DayHeader, Tasks, WeekTargets, quick notes |
| KanbanBoard.jsx | 4-column drag-drop board; manages card create/edit modals |
| ActivityLog.jsx | Editable/deletable feed; inline note input on counter increment |
| JobBoardsTab.jsx | Boards, search strings, keyword sets (all from settings collection) |
| ProfileTab.jsx | Pitch content (from `pitch` settings key) |
| SettingsTab.jsx | Export/import, user prefs, weekly targets, notes TTL |
| Tasks.jsx | Today's Focus list with pin/complete/delete |
| WeekTargets.jsx | Weekly counters with increment/decrement |

## Persistence Schema

### cards
```js
{
  id, col: "saved"|"applied"|"interviewing"|"closed",
  company, title, location, description, url, notes,
  added: "YYYY-MM-DD",
  dates: { saved, applied, interviewing, closed }, // each "YYYY-MM-DD" or null
  isHighPriority: bool, priorityOrder: timestamp, isStarred: bool
}
```

### tasks
```js
{ id, text, completed: bool, pinned: bool }
```

### activity_log
```js
{ id, action: string, timestamp: ISO, metadata: {} }
```

### notes
```js
{ id, content: string, expiresAt: ISO }
```
Expired notes are migrated to activity_log and deleted from notes collection.

### weekly_stats
```js
{ id, weekKey: "YYYY-WXX", metric: string, count: number }
```
⚠️ Race condition risk on rapid increments. Uses ref-based promise queue
to serialize GET→check→POST/PATCH sequences.

### settings (key-value store)
Each record: `{ key: string, value: JSON string, userId: string }`

Active keys: cumulative, streak, lastActive, pitch, user-settings,
notes-ttl-hours, job-dashboard-boards, job-dashboard-search-strings,
job-dashboard-keywords

## Auth Flow

1. User submits credentials to `/auth/login` (Express proxy)
2. Proxy forwards to PocketBase, returns token
3. Frontend stores `pb_token` and `pb_userId` in localStorage
4. All subsequent requests include `Authorization: Bearer <token>`
5. App.jsx checks for valid token on mount; shows LoginScreen if missing

## Legacy Migration

Older versions stored data in localStorage under keys like `notes`,
`notesByDate`, `weekly-<weekKey>`. Load paths in useAppData still check
these keys as fallbacks and migrate data to PocketBase on first read.
Do not remove fallback logic without explicit instruction.

## Cloudflare Pages Constraint

Cannot run Express server on Cloudflare. Frontend uses conditional
`BASE_URL` logic in `pb.js` to route requests correctly in production
vs localhost.

## Settings vs. Promoted Collections

- **Settings collection:** Bounded, low-frequency config (boards, keywords,
  search strings, pitch, user prefs). Stored as JSON blobs.
- **Dedicated collections:** Unbounded, high-frequency data (tasks, cards,
  activity entries, notes, weekly stats). Each gets its own PocketBase collection.

## Schema Change Workflow

This section documents the PocketBase schema workflow, migrated from `docs/SCHEMA-WORKFLOW.md`.

### Goal

Keep development local, keep schema/version history in GitHub, and keep production changes intentional and reproducible.

### Core Rules

- Make schema changes locally first.
- Export schema snapshot into this repo after each schema change.
- Use migration scripts for structural/data changes that must be replayed in production.
- Do not hand-edit production code or schema directly on the Oracle host.
- SSH access should be limited to ops tasks (service checks, env updates, logs, backups, restores).

### Source of Truth

- Snapshot file: `schema/pocketbase-collections.json`
- Migration scripts: `scripts/*.js` (idempotent when possible)

Snapshots provide visibility and code review diffs. Migrations provide repeatable production application.

### Local Schema Change Flow

1. Start local PocketBase and app stack:

```bash
./pocketbase/pocketbase serve --http=127.0.0.1:8090
npm run dev
```

2. Make schema changes locally (PocketBase admin UI or migration script).

3. Export schema snapshot:

```bash
PB_URL=http://127.0.0.1:8090 \
PB_ADMIN_EMAIL=<admin-email> \
PB_ADMIN_PASSWORD=<admin-password> \
npm run schema:export
```

4. Review the schema diff in `schema/pocketbase-collections.json`.

5. Commit:

- Schema snapshot update
- Any migration script created for the change
- App code changes that depend on the schema

### Promotion to Production

1. Deploy code from GitHub.
2. Apply required migration scripts from your local machine:

```bash
npm run migrate -- <migration-script>.js
```

3. Run post-migration verification:

- API health check
- App login
- Core collection reads/writes

4. Re-export schema from production only when you need a verification snapshot.

### Safety Checklist

- Keep `.env` and `server/.env` out of git.
- Keep production env files in `/etc/job-dashboard/` with `chmod 600`.
- Keep Oracle ingress limited to 80/443 (plus SSH management access).
- Keep PocketBase and Node API bound to loopback.
- Keep migration scripts in source control and reviewed before running.

### Related Docs

- [docs/LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md)
- [docs/ops/SERVER-RUNBOOK.md](ops/SERVER-RUNBOOK.md)