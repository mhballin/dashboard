import fs from 'node:fs/promises';
import { renderWeeklyRecap } from './renderTemplate.js';

async function main() {
  const sample = JSON.parse(await fs.readFile(new URL('./sampleRecapData.json', import.meta.url), 'utf8'));
  const html = await renderWeeklyRecap(sample);
  await fs.writeFile('/tmp/weekly-recap.html', html, 'utf8');
  console.log('Wrote /tmp/weekly-recap.html');
}

main().catch((err) => { console.error(err); process.exit(1); });
