// Kirjoittaa yhteydenottoviestin jokaiselle valmiille demolle. EI lähetä mitään.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, fillTemplate } from './db.js';
import { ask } from './claude.js';

export async function draft(db) {
  const dir = path.join(ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const queue = Object.values(db).filter((l) => l.status === 'demo');

  for (const lead of queue) {
    const email = lead.sahkopostit?.[0] || null;
    const kanava = email ? 'sähköposti' : lead.someLinkki ? 'somen yksityisviesti' : 'puhelu';
    process.stdout.write(`  luonnos ${lead.nimi} (${kanava})… `);
    const text = await ask(fillTemplate('viesti.md', {
      nimi: lead.nimi,
      toimiala: lead.toimiala,
      kaupunki: lead.kaupunki,
      kanava,
      tarve: lead.tarve,
      ongelmat: (lead.ongelmat || []).join(', '),
      demoUrl: lead.demoUrl,
      lahettaja: process.env.SENDER_NAME || '',
      puhelin: process.env.SENDER_PHONE || '',
    }), 2000);

    fs.writeFileSync(path.join(dir, `${lead.slug}.md`), text.trim() + '\n');
    Object.assign(lead, { kanava, email, status: 'luonnos' });
    console.log('✓');
  }
  return queue.length;
}

export function readDraft(slug) {
  const raw = fs.readFileSync(path.join(ROOT, 'drafts', `${slug}.md`), 'utf8');
  const subject = raw.match(/^Aihe:\s*(.+)$/m)?.[1]?.trim() || 'Uusi verkkosivu';
  const body = raw.replace(/^Aihe:.*\n+/m, '').trim();
  return { subject, body };
}
