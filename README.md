# Job Search HQ

A clean, modern job-search command center (Vite + React). Track weekly targets, daily tasks, job applications in a kanban board, and maintain a searchable reference of job boards and LinkedIn Boolean search strings.

## Getting Started

```bash
cd "/Users/michaelballin/Documents/Projects/Job Dashboard"
npm install
npm run dev
```

App opens at `http://localhost:5173`

## Build

```bash
npm run build  
npm run preview
```

## Features

### Dashboard Tab
- **Streak tracker** – Daily check-ins with cumulative metrics
- **Today's Focus** – 3 pinned tasks + backlog
- **This Week** – Track 5 key metrics (Conversations, Meetings, Outreach, Follow-ups, Applications)
- **Pitch & Notes** – Collapsible section for your elevator pitch and scratch notes

### Applications Tab
- **Kanban board** – 4 columns (Saved → Applied → Interviewing → Closed)
- Drag-and-drop cards with company/role names and job URLs

### Job Boards & Keywords Tab
- **6 LinkedIn Boolean searches** – All copyable with one click
- **7 keyword categories** – Primary titles, stretch roles, company types, sectors, skills
- **25+ job boards** – Organized by startup focus, regional, general, newsletters, niche/specialty

## Data Persistence

All data persists in browser `localStorage`:
- Data is namespaced by ISO week (e.g., `weekly-2026-W10`) so metrics reset each week
- Cumulative totals, streak, pitch, notes, and kanban cards stay year-round
- Falls back to `window.storage` if running in a Claude artifact environment

## Project Structure

```
src/
├── App.jsx                 (state management + routing)
├── main.jsx                (React entry)
├── components/             (9 reusable UI components)
├── data/                   (jobBoards, keywords, kanban columns, defaults)
└── utils/                  (storage, date helpers)
```

No external CSS – all inline styles. Fonts load from Google Fonts (Plus Jakarta Sans, JetBrains Mono).
