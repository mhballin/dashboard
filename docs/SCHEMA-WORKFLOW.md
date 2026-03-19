# PocketBase Schema Workflow

This document defines the schema source-of-truth workflow for Job Search HQ.

## Goal

Keep development local, keep schema/version history in GitHub, and keep production changes intentional and reproducible.

## Core Rules

- Make schema changes locally first.
- Export schema snapshot into this repo after each schema change.
- Use migration scripts for structural/data changes that must be replayed in production.
- Do not hand-edit production code or schema directly on the Oracle host.
- SSH access should be limited to ops tasks (service checks, env updates, logs, backups, restores).

## Source of Truth

- Snapshot file: `schema/pocketbase-collections.json`
- Migration scripts: `scripts/*.js` (idempotent when possible)

Snapshots provide visibility and code review diffs.
Migrations provide repeatable production application.

## Local Schema Change Flow

1. Start local PocketBase and app stack:

```bash
./pocketbase/pocketbase serve --http=127.0.0.1:8090
npm run dev:app
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

## Promotion to Production

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

## Safety Checklist

- Keep `.env` and `server/.env` out of git.
- Keep production env files in `/etc/job-dashboard/` with `chmod 600`.
- Keep Oracle ingress limited to 80/443 (plus SSH management access).
- Keep PocketBase and Node API bound to loopback.
- Keep migration scripts in source control and reviewed before running.

## Related Docs

- [docs/LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/ops/SERVER-RUNBOOK.md](ops/SERVER-RUNBOOK.md)
