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

## Why I built this

I made this as a practical, private workspace to stop scattering job leads across tabs, notes, and browser bookmarks. It collects the tiny pieces that matter — a place to store search strings, a kanban for applications, quick outreach notes, and simple weekly targets — and keeps them local and offline-first. It helps me stay focused without forcing a complicated workflow.

