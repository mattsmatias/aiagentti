import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, STATUSES, load, save, bySlug, addOptOut } from './db.js';
import { find } from './find.js';
import { audit } from './audit.js';
import { build } from './build.js';
import { draft } from './draft.js';
import { send } from './send.js';
import { review } from './review.js';

const [cmd, ...args] = process.argv.slice(2);
const db = load();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'haut.json'), 'utf8'));
const persist = () => save(db);
process.on('SIGINT', () => { persist(); process.exit(130); });

function deploy() {
  const cmd = process.env.DEPLOY_CMD;
  if (!cmd) { console.log('  DEPLOY_CMD puuttuu, demot jäävät vain paikallisesti kansioon demos/'); return; }
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function status() {
  const all = Object.values(db);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((l) => l.status === s).length]));
  console.table(counts);
  const manual = all.filter((l) => l.status === 'hyväksytty' && !l.email);
  if (manual.length) {
    console.log('\nHyväksytyt, joihin otetaan yhteyttä itse (puhelu/some):');
    manual.forEach((l) => console.log(`  ${l.nimi} · ${l.puhelin || l.someLinkki || '–'} · drafts/${l.slug}.md`));
  }
}

const steps = {
  async find() { console.log(`Uusia yrityksiä: ${await find(db, config)}`); },
  async audit() { console.log(`Liidejä: ${await audit(db)}`); },
  async build() { console.log(`Rakennettu: ${await build(db, Number(args[0] || process.env.BUILDS_PER_RUN || 5))}`); },
  async deploy() { deploy(); },
  async draft() { console.log(`Luonnoksia: ${await draft(db)}`); },
  async review() { console.log(`Katselmointisivu: ${review(db)}`); },
  async send() { console.log(`Lähetetty: ${await send(db)}`); },
  async status() { status(); },

  async approve() {
    for (const slug of args) {
      const l = bySlug(db, slug);
      if (!l) { console.log(`  ✗ ${slug}: ei löydy`); continue; }
      l.status = 'hyväksytty';
      console.log(`  ✓ ${l.nimi} hyväksytty (${l.email ? 'lähtee: npm run send' : 'ota yhteyttä itse'})`);
    }
  },

  async set() {
    const [slug, s] = args;
    const l = bySlug(db, slug);
    if (!l || !STATUSES.includes(s)) { console.log(`Käyttö: npm run set -- <slug> <${STATUSES.join('|')}>`); return; }
    l.status = s;
    if (s === 'ei-kiinnosta') [l.email, l.puhelin].filter(Boolean).forEach(addOptOut);
    console.log(`  ${l.nimi} → ${s}`);
  },

  // Googlen ehdot: Places-sisältöä ei säilytetä pitkään. place_id saa jäädä.
  async prune() {
    const cutoff = Date.now() - 30 * 864e5;
    let n = 0;
    for (const l of Object.values(db)) {
      if (['hylätty', 'ei-kiinnosta'].includes(l.status) && new Date(l.placesHaettu) < cutoff) {
        db[l.id] = { id: l.id, slug: l.slug, status: l.status, placesHaettu: l.placesHaettu };
        n++;
      }
    }
    console.log(`Siivottu ${n} vanhaa liidiä`);
  },

  async kierros() {
    for (const s of ['find', 'audit', 'build', 'deploy', 'draft', 'review']) {
      console.log(`\n▶ ${s}`);
      await steps[s]();
      persist();
    }
    console.log('\nValmis. Mitään ei lähetetty. Katselmoi: data/katselmointi.html');
  },
};

if (!steps[cmd]) {
  console.log(`Komennot: ${Object.keys(steps).join(', ')}`);
  process.exit(1);
}
try { await steps[cmd](); } finally { persist(); }
