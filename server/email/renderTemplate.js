import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatePath = path.join(__dirname, 'templates', 'weekly-recap.mjml');

let compiledTemplatePromise = null;

function ensureHelpersRegistered() {
  if (!Handlebars.helpers.typeEmoji) {
    Handlebars.registerHelper('typeEmoji', (type) => {
      const t = String(type || '').toLowerCase();
      if (t === 'meeting' || t === 'meetings') return '🤝';
      if (t === 'outreach') return '📧';
      if (t === 'application' || t === 'applications') return '✅';
      if (t === 'followup' || t === 'followups') return '🔄';
      return '•';
    });
  }
  if (!Handlebars.helpers.titleCase) {
    Handlebars.registerHelper('titleCase', (value) => {
      const text = String(value || '');
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    });
  }
  if (!Handlebars.helpers.cardList) {
    Handlebars.registerHelper('cardList', (cards) => {
      if (!Array.isArray(cards) || cards.length === 0) return 'None';
      return cards.map((card) => card.company || 'Unknown').join(', ');
    });
  }
}

async function getCompiledTemplate() {
  if (!compiledTemplatePromise) {
    compiledTemplatePromise = fs.readFile(templatePath, 'utf8').then((source) => {
      ensureHelpersRegistered();
      return Handlebars.compile(source);
    });
  }
  return compiledTemplatePromise;
}

export async function renderWeeklyRecap(recapData) {
  const compile = await getCompiledTemplate();
  const mjmlMarkup = compile({
    ...recapData,
    fromEmail: globalThis.process?.env?.RECAP_FROM_EMAIL || 'dashboard@michaelballin.com',
  });
  const { html, errors } = mjml2html(mjmlMarkup, { validationLevel: 'strict' });
  if (errors && errors.length) {
    const detail = errors.map((e) => e.formattedMessage || e.message).join('; ');
    throw new Error(`MJML render failed: ${detail}`);
  }
  return html;
}
