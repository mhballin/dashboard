# Job Search Dashboard

A personal job-search command center built with React + Vite. Tracks 
weekly goals, manages applications on a kanban board, and stores 
curated job board links and LinkedIn Boolean search strings — all 
in the browser with no backend required.

## Getting Started
```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Features

- **Dashboard** — daily streak, today's top 3 tasks, weekly metric 
	counters (meetings, outreach, follow-ups, applications), pitch & 
	scratch notes
- **Activity Log** — timestamped log of outreach, meetings, and 
	applications
- **Applications** — drag-and-drop kanban board (Saved → Applied → 
	Interviewing → Closed) with per-card notes and job descriptions
- **Job Boards & Keywords** — curated job boards, keyword library, 
	and copyable LinkedIn Boolean search strings
- **Settings** — export and import all data as a JSON backup file

## Data & Privacy

All data lives in your browser's localStorage — nothing is sent to 
any server. Use the Export button in Settings to download a backup 
file. Import restores everything from that file.

## Project Structure
src/
├── App.jsx              state management + tab routing
├── components/          UI components
├── data/                seed data (job boards, keywords, defaults)
└── utils/
├── storage.js       S.get / S.set / exportAll / importAll
└── dates.js         todayStr / getWeekKey
## Development Conventions

- **Inline styles only** — no CSS files, no Tailwind
- **No new dependencies** — native browser APIs only
- **State in App.jsx** — all app state lives in the root component
- **Font** — Plus Jakarta Sans throughout

## License

MIT
---
