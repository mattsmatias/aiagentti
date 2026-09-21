// Lähettää VAIN hyväksytyt sähköpostit. Hyväksyntä: npm run approve -- <slug>
import nodemailer from 'nodemailer';
import { optOuts } from './db.js';
import { readDraft } from './draft.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function send(db) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SENDER_EMAIL, SENDER_NAME } = process.env;
  if (!SMTP_HOST || !SENDER_EMAIL) throw new Error('SMTP-asetukset puuttuvat .env-tiedostosta');
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const blocked = optOuts();
  const max = Number(process.env.MAX_SENDS_PER_RUN || 10);
  const queue = Object.values(db).filter((l) => l.status === 'hyväksytty' && l.email).slice(0, max);
  let sent = 0;

  for (const lead of queue) {
    const domain = lead.email.split('@')[1];
    if (blocked.has(lead.email) || blocked.has(domain)) {
      lead.status = 'ei-kiinnosta';
      console.log(`  ohitetaan ${lead.nimi} (kieltolistalla)`);
      continue;
    }
    const { subject, body } = readDraft(lead.slug);
    const footer = `\n\n--\nJos et halua enempää viestejä, vastaa "ei kiitos", niin en ota enää yhteyttä.`;
    await transport.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`, to: lead.email, subject, text: body + footer,
    });
    Object.assign(lead, { status: 'lähetetty', lahetetty: new Date().toISOString() });
    sent++;
    console.log(`  ✓ ${lead.nimi} <${lead.email}>`);
    await sleep(30000);
  }
  return sent;
}
