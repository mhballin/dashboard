# Job Search HQ

A focused job-search workspace for tracking applications, outreach, and weekly momentum in one place.

(screenshot)

## Live App

- App URL: https://dashboard.michaelballin.com
- Create an account from the login screen with your email and password.
- Returning users can sign in from the same screen.

## What It Does

- **Dashboard** — Quick view of today: the top tasks (drag to reorder), a streak banner, weekly target counters (meetings, outreach, follow-ups, applications), and a quick-note area for pitch or scratch notes.
- **Applications (Kanban)** — Four-column board (Saved → Applied → Interviewing → Closed). Create, edit, and drag job cards; cards store company, title, URL, description and notes. Moving cards to Applied/Interviewing/Closed stamps dates and adds an entry to the activity log.
- **Job Boards & Search Strings** — Curated grid of saved job boards and editable LinkedIn/Boolean search strings you can copy. Add, edit, or remove boards and search queries from the UI.
- **Activity Log** — Chronological log that groups meetings, outreach, follow-ups and applications by date. Each entry is editable and removable.
- **Profile** — Lightweight place to keep a short pitch you reuse for outreach.
- **Settings / Backups** — Export and import a single JSON file to back up or restore all data; change weekly targets, name, and quick-note retention.

## Who It Is For

Job Search HQ is built for job seekers who want one command center for daily execution: what to apply to, who to follow up with, and whether weekly goals are on track.

## Stack

- React (JSX) + Vite
- Frontend hosting: Cloudflare Pages
- API: Express proxy (`server/index.js`)
- Backend data store: PocketBase on Oracle Cloud
- UI: inline styles, Plus Jakarta Sans font
- No external UI libraries or CSS frameworks
- Drag-and-drop: native HTML5 drag-and-drop (no DnD library)

## How It Is Deployed

- Frontend: Cloudflare Pages at `dashboard.michaelballin.com`
- API: `api.dashboard.michaelballin.com` on Oracle Cloud
- PocketBase: `pocketbase.michaelballin.com` on Oracle Cloud
- Reverse proxy: Caddy on the Oracle VM

The browser talks to the Express API, and the API forwards authenticated collection requests to PocketBase.

## Documentation

Developer and operations docs:

- [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md)
- [docs/SCHEMA-WORKFLOW.md](docs/SCHEMA-WORKFLOW.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/ops/SERVER-RUNBOOK.md](docs/ops/SERVER-RUNBOOK.md)

Production infrastructure templates:

- [server/deploy/job-dashboard-api.service.example](server/deploy/job-dashboard-api.service.example)

## Why I built this

I made this as a practical workspace to stop scattering job leads across tabs, notes, and browser bookmarks. It collects the small pieces that matter — search strings, a kanban for applications, quick outreach notes, and weekly targets — and keeps them in one system instead of across disconnected tools.

