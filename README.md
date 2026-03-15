# Job Search HQ

A compact, single-page job-search command center I built to keep applications, outreach, and search strings in one place — no backend required. Built by Michael Ballin.

(screenshot)

## Features

- **Dashboard** — Quick view of today: the top tasks (drag to reorder), a streak banner, weekly target counters (meetings, outreach, follow-ups, applications), and a quick-note area for pitch or scratch notes.
- **Applications (Kanban)** — Four-column board (Saved → Applied → Interviewing → Closed). Create, edit, and drag job cards; cards store company, title, URL, description and notes. Moving cards to Applied/Interviewing/Closed stamps dates and adds an entry to the activity log.
- **Job Boards & Search Strings** — Curated grid of saved job boards and editable LinkedIn/Boolean search strings you can copy. Add, edit, or remove boards and search queries from the UI.
- **Activity Log** — Chronological log that groups meetings, outreach, follow-ups and applications by date. Each entry is editable and removable.
- **Profile** — Lightweight place to keep a short pitch you reuse for outreach.
- **Settings / Backups** — Export and import a single JSON file to back up or restore all data; change weekly targets, name, and quick-note retention.

All data is persisted locally in your browser's `localStorage` — nothing is sent to a server. Use Settings → Export to download a backup.

## Stack

- React (JSX) + Vite
- Persistence: browser `localStorage` (no backend)
- UI: inline styles, Plus Jakarta Sans font
- No external UI libraries or CSS frameworks
- Drag-and-drop: native HTML5 drag-and-drop (no DnD library)

## Getting started

1. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

2. Open http://localhost:5173

## Environment configuration

This project now requires environment-driven endpoint configuration and does not hardcode backend URLs.

### Local development

1. Copy [.env.example](.env.example) to `.env` in the repo root.
2. Copy [server/.env.example](server/.env.example) to `server/.env`.
3. Set `PB_URL` in `server/.env` to your hosted PocketBase URL.
4. Start backend and frontend in separate terminals:

```bash
npm --prefix server run dev
npm run dev
```

### Variables

- `PB_URL` (required, server): PocketBase base URL, for example `https://pocketbase.example.com`
- `PORT` (optional, server): API server port (default `3001`)
- `CORS_ALLOWED_ORIGINS` (optional, server): comma-separated browser origins allowed to call the API, for example `https://dashboard.michaelballin.com,http://localhost:5173`
- `UPSTREAM_TIMEOUT_MS` (optional, server): timeout for PocketBase requests in milliseconds (default `15000`)
- `VITE_API_PROXY_TARGET` (required for Vite dev): backend target used by the Vite proxy, for example `http://127.0.0.1:3001`
- `VITE_API_URL` (optional, frontend build): absolute API base URL for deployed frontend, for example `https://api.example.com`

When `VITE_API_URL` is empty, frontend requests stay relative (`/auth`, `/api`) and rely on proxy/same-origin routing.

### Production (Systemd EnvironmentFile)

Use a locked-down EnvironmentFile on your Oracle host, for example `/etc/job-dashboard/api.env`:

```bash
PB_URL=https://pocketbase.example.com
PORT=3001
```

Recommended permissions:

```bash
sudo chown root:root /etc/job-dashboard/api.env
sudo chmod 600 /etc/job-dashboard/api.env
```

Then reference it in your service unit:

```ini
[Service]
EnvironmentFile=/etc/job-dashboard/api.env
WorkingDirectory=/path/to/Job Dashboard/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=3
```

Detailed production operations are documented in:

- [docs/ops/SERVER-RUNBOOK.md](docs/ops/SERVER-RUNBOOK.md)
- [server/deploy/job-dashboard-api.service.example](server/deploy/job-dashboard-api.service.example)

## Why I built this

I made this as a practical, private workspace to stop scattering job leads across tabs, notes, and browser bookmarks. It collects the tiny pieces that matter — a place to store search strings, a kanban for applications, quick outreach notes, and simple weekly targets — and keeps them local and offline-first. It helps me stay focused without forcing a complicated workflow.

