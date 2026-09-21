// Rakentaa jokaiselle liidille yksisivuisen demosivun Clauden avulla.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, fillTemplate } from './db.js';
import { ask } from './claude.js';

function extractHtml(text) {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  const html = (fenced ? fenced[1] : text.slice(text.search(/<!doctype html/i))).trim();
  if (!/<!doctype html/i.test(html) || !/<\/html>/i.test(html)) throw new Error('Vastauksesta ei löytynyt kokonaista HTML-sivua');
  return html;
}

export async function build(db, limit) {
  const queue = Object.values(db)
    .filter((l) => l.status === 'auditoitu')
    .sort((a, b) => (b.prioriteetti || 0) - (a.prioriteetti || 0))
    .slice(0, limit);

  for (const lead of queue) {
    process.stdout.write(`  rakennetaan ${lead.nimi}… `);
    const prompt = fillTemplate('demo-sivu.md', {
      nimi: lead.nimi,
      toimiala: lead.toimiala,
      kaupunki: lead.kaupunki,
      osoite: lead.osoite || '',
      puhelin: lead.puhelin || '(ei tiedossa, käytä paikkamerkkiä)',
      aukiolo: lead.aukiolo?.length ? lead.aukiolo.join('\n') : '(ei tiedossa)',
      arvio: lead.arvio ? `${lead.arvio} / 5 (${lead.arvioita} arvostelua Googlessa)` : '(ei arvosteluja)',
      vanhaSivu: lead.verkkosivu || '(ei sivua)',
      mapsUrl: lead.mapsUrl || '',
      tekija: process.env.SENDER_NAME || 'Hunmedia',
    });
    try {
      const html = extractHtml(await ask(prompt));
      const dir = path.join(ROOT, 'demos', lead.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
      lead.demoUrl = `${(process.env.DEMO_BASE_URL || '').replace(/\/$/, '')}/${lead.slug}/`;
      lead.status = 'demo';
      console.log('✓');
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }
  return queue.length;
}
