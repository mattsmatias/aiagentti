// Arvioi, tarvitseeko yritys uuden sivun. Mitä korkeammat pisteet, sitä parempi liidi.
const THIS_YEAR = new Date().getFullYear();

async function pageSpeed(url) {
  const key = process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : '';
  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance${key}`,
      { signal: AbortSignal.timeout(60000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const s = data.lighthouseResult?.categories?.performance?.score;
    return typeof s === 'number' ? Math.round(s * 100) : null;
  } catch { return null; }
}

export async function auditSite(url) {
  const r = { ongelmat: [], pisteet: 0, sahkopostit: [] };
  const add = (p, msg) => { r.pisteet += p; r.ongelmat.push(msg); };
  let html = '', finalUrl = url, ms = 0;

  try {
    const t = Date.now();
    const res = await fetch(url, {
      redirect: 'follow', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HunmediaAudit/1.0)' },
    });
    ms = Date.now() - t;
    finalUrl = res.url;
    html = await res.text();
    if (!res.ok) add(40, `Sivu palauttaa virheen (HTTP ${res.status})`);
  } catch {
    add(70, 'Sivu ei aukea lainkaan');
    r.pisteet = Math.min(100, r.pisteet);
    return r;
  }

  if (!finalUrl.startsWith('https://')) add(15, 'Ei HTTPS-suojausta');
  if (!/<meta[^>]+name=["']viewport/i.test(html)) add(20, 'Ei mobiilioptimointia');

  const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)]
    .map((m) => +m[1]).filter((y) => y > 1995 && y <= THIS_YEAR);
  if (years.length) {
    const y = Math.max(...years);
    if (THIS_YEAR - y >= 3) add(Math.min(20, (THIS_YEAR - y) * 4), `Copyright-vuosi ${y}`);
  }

  if (/<font[\s>]|<marquee|<center>|\.swf["']/i.test(html)) add(15, 'Vanhentunutta HTML-koodia');
  if ((html.match(/<table/gi) || []).length > 5 && !/<(header|nav|main|section)[\s>]/i.test(html)) {
    add(10, 'Taulukkopohjainen vanha rakenne');
  }
  if (/wix|weebly|jimdo|webnode|kotisivukone|sivuviidakko/i.test(html.slice(0, 20000))) add(8, 'Kotisivukonepohja');
  if (ms > 4000) add(10, `Hidas vastaus (${(ms / 1000).toFixed(1)} s)`);

  const ps = await pageSpeed(finalUrl);
  if (ps !== null) {
    r.pagespeed = ps;
    if (ps < 30) add(25, `PageSpeed mobiili ${ps}/100`);
    else if (ps < 50) add(15, `PageSpeed mobiili ${ps}/100`);
  }

  r.sahkopostit = [...new Set(
    [...html.matchAll(/mailto:([^"'?>\s]+@[^"'?>\s]+)/gi)].map((m) => decodeURIComponent(m[1]).toLowerCase()),
  )].filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e)).slice(0, 3);

  r.pisteet = Math.min(100, r.pisteet);
  return r;
}

export async function audit(db) {
  const threshold = Number(process.env.AUDIT_THRESHOLD || 45);
  let liideja = 0;
  for (const lead of Object.values(db).filter((l) => l.status === 'uusi')) {
    const aktiivisuus = (lead.arvioita > 20 ? 10 : 0) + (lead.arvio >= 4.3 ? 5 : 0);

    if (!lead.verkkosivu) {
      lead.tarve = lead.someLinkki ? 'vain-some' : 'ei-sivua';
      lead.prioriteetti = (lead.someLinkki ? 85 : 80) + aktiivisuus;
      lead.ongelmat = [lead.someLinkki ? 'Vain somesivu, ei omaa verkkosivua' : 'Ei verkkosivua'];
      lead.status = 'auditoitu';
      liideja++;
      continue;
    }

    process.stdout.write(`  auditoidaan ${lead.nimi}… `);
    const a = await auditSite(lead.verkkosivu);
    Object.assign(lead, {
      tarve: 'vanha-sivu', ongelmat: a.ongelmat, auditPisteet: a.pisteet,
      pagespeed: a.pagespeed ?? null, sahkopostit: a.sahkopostit,
      prioriteetti: a.pisteet + aktiivisuus,
      status: a.pisteet >= threshold ? 'auditoitu' : 'hylätty',
    });
    if (lead.status === 'auditoitu') liideja++;
    console.log(`${a.pisteet} p ${lead.status === 'auditoitu' ? '✓ liidi' : '– ok sivu'}`);
  }
  return liideja;
}
