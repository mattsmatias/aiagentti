import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const FILE = path.join(DATA, 'leads.json');
const OPTOUT = path.join(DATA, 'kielletyt.json');

export const STATUSES = [
  'uusi', 'auditoitu', 'hylätty', 'demo', 'luonnos',
  'hyväksytty', 'lähetetty', 'vastasi', 'asiakas', 'ei-kiinnosta',
];

export function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

export function save(db) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function upsert(db, lead) {
  const now = new Date().toISOString();
  const prev = db[lead.id] || { createdAt: now };
  db[lead.id] = { ...prev, ...lead, updatedAt: now };
  return db[lead.id];
}

export function bySlug(db, slug) {
  return Object.values(db).find((l) => l.slug === slug);
}

export function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function uniqueSlug(db, base) {
  const taken = new Set(Object.values(db).map((l) => l.slug));
  let s = base, i = 2;
  while (taken.has(s)) s = `${base}-${i++}`;
  return s;
}

export function optOuts() {
  try { return new Set(JSON.parse(fs.readFileSync(OPTOUT, 'utf8'))); } catch { return new Set(); }
}

export function addOptOut(value) {
  const set = optOuts();
  set.add(value.toLowerCase());
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(OPTOUT, JSON.stringify([...set], null, 2));
}

export function fillTemplate(file, vars) {
  const tpl = fs.readFileSync(path.join(ROOT, 'prompts', file), 'utf8');
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}
