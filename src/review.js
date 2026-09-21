// Luo data/katselmointi.html: kaikki demot ja luonnokset yhdellä sivulla hyväksyttäväksi.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function review(db) {
  const leads = Object.values(db)
    .filter((l) => ['demo', 'luonnos'].includes(l.status))
    .sort((a, b) => (b.prioriteetti || 0) - (a.prioriteetti || 0));

  const cards = leads.map((l) => {
    const draftFile = path.join(ROOT, 'drafts', `${l.slug}.md`);
    const draftText = fs.existsSync(draftFile) ? fs.readFileSync(draftFile, 'utf8') : '(luonnos puuttuu)';
    return `<article>
  <header><h2>${esc(l.nimi)}</h2><span class="p">${l.prioriteetti ?? '–'}</span></header>
  <p>${esc(l.toimiala)}, ${esc(l.kaupunki)} · ${esc((l.ongelmat || []).join(', '))}</p>
  <p>Kanava: <b>${esc(l.kanava || '–')}</b> ${esc(l.email || l.puhelin || l.someLinkki || '')}</p>
  <p><a href="../demos/${esc(l.slug)}/index.html" target="_blank">Avaa demo</a>${l.verkkosivu ? ` · <a href="${esc(l.verkkosivu)}" target="_blank">Nykyinen sivu</a>` : ''}</p>
  <pre>${esc(draftText)}</pre>
  <code>npm run approve -- ${esc(l.slug)}</code>
</article>`;
  }).join('\n');

  const html = `<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Liidit katselmoitavana (${leads.length})</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#1d2433}
article{border:1px solid #d5dae3;border-radius:10px;padding:1rem 1.25rem;margin:1rem 0}
header{display:flex;justify-content:space-between;align-items:baseline}h2{margin:0;font-size:1.2rem}
.p{font-weight:700;color:#0a6b4f}pre{white-space:pre-wrap;background:#f3f5f9;padding:.75rem;border-radius:6px}
code{background:#1d2433;color:#fff;padding:.2rem .5rem;border-radius:4px}</style>
<h1>Liidit katselmoitavana (${leads.length})</h1>${cards || '<p>Ei katselmoitavaa. Aja npm run kierros.</p>'}</html>`;

  const out = path.join(ROOT, 'data', 'katselmointi.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return out;
}
