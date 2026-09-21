// Hakee yrityksiä Google Places API:sta (New) ja tallentaa ne liideiksi.
import { upsert, slugify, uniqueSlug } from './db.js';

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.websiteUri',
  'places.nationalPhoneNumber', 'places.primaryTypeDisplayName', 'places.rating',
  'places.userRatingCount', 'places.regularOpeningHours.weekdayDescriptions',
  'places.businessStatus', 'places.googleMapsUri', 'nextPageToken',
].join(',');

const SOME_ONLY = /(facebook\.com|instagram\.com|linktr\.ee|tiktok\.com|business\.site)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchPlaces(query, maxPages) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY puuttuu .env-tiedostosta');
  const out = [];
  let pageToken;
  for (let i = 0; i < maxPages; i++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery: query, languageCode: 'fi', regionCode: 'FI', pageSize: 20, ...(pageToken && { pageToken }) }),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    out.push(...(data.places || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    await sleep(1500);
  }
  return out;
}

export async function find(db, config) {
  let added = 0;
  for (const kaupunki of config.kaupungit) {
    for (const toimiala of config.toimialat) {
      const query = `${toimiala} ${kaupunki}`;
      let places;
      try { places = await searchPlaces(query, config.sivujaPerHaku || 1); }
      catch (e) { console.error(`  ✗ ${query}: ${e.message}`); continue; }

      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
        const nimi = p.displayName?.text;
        if (!nimi) continue;
        const exists = db[p.id];
        const site = p.websiteUri || null;
        upsert(db, {
          id: p.id,
          slug: exists?.slug || uniqueSlug(db, slugify(`${nimi} ${kaupunki}`)),
          nimi,
          kaupunki,
          toimiala: p.primaryTypeDisplayName?.text || toimiala,
          hakusana: toimiala,
          osoite: p.formattedAddress,
          puhelin: p.nationalPhoneNumber || null,
          verkkosivu: site && !SOME_ONLY.test(site) ? site : null,
          someLinkki: site && SOME_ONLY.test(site) ? site : exists?.someLinkki || null,
          arvio: p.rating ?? null,
          arvioita: p.userRatingCount ?? 0,
          aukiolo: p.regularOpeningHours?.weekdayDescriptions || [],
          mapsUrl: p.googleMapsUri,
          placesHaettu: new Date().toISOString(),
          status: exists?.status || 'uusi',
        });
        if (!exists) added++;
      }
      console.log(`  ${query}: ${places.length} tulosta`);
    }
  }
  return added;
}
