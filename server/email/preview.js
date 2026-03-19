import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderWeeklyRecap } from './renderTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleData = {
  weekLabel: 'Mar 10 - Mar 16, 2026',
  stats: {
    applications: 3,
    meetings: 2,
    outreach: 5,
    followups: 1,
    isEmpty: false,
  },
  hasActivityLog: true,
  activityLog: [
    {
      dateLabel: 'Thursday, Mar 13',
      entries: [
        { type: 'meeting', note: 'Coffee with Sarah at Acme, discussed PM role' },
        { type: 'outreach', note: 'Followed up with recruiter at Stripe' },
      ],
    },
    {
      dateLabel: 'Tuesday, Mar 11',
      entries: [{ type: 'application', note: 'Applied to Product Lead at Notion' }],
    },
  ],
  pipeline: {
    saved: { count: 2, cards: [{ company: 'Acme' }, { company: 'Linear' }] },
    applied: { count: 3, cards: [{ company: 'GitHub' }, { company: 'Retool' }, { company: 'Figma' }] },
    interviewing: { count: 1, cards: [{ company: 'Anthropic' }] },
    closedThisWeek: { count: 1, cards: [{ company: 'Meta' }] },
  },
  hasStaleCards: true,
  staleCards: [
    { company: 'Retool', col: 'applied', daysStale: 18 },
    { company: 'Figma', col: 'applied', daysStale: 15 },
  ],
  tasks: {
    isEmpty: false,
    pinned: [{ text: 'Follow up with Anthropic recruiter' }],
    unpinned: [{ text: 'Update portfolio site' }],
  },
};

async function run() {
  const html = await renderWeeklyRecap(sampleData);
  const outPath = path.join(__dirname, 'preview.html');
  await fs.writeFile(outPath, html, 'utf8');
  console.log(`Weekly recap preview written to ${outPath}`);
}

run().catch((error) => {
  console.error('Failed to render weekly recap preview', error);
  if (globalThis.process) globalThis.process.exitCode = 1;
});
