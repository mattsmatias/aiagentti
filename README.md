# Hunmedia-liidiagentti

Etsii pienyrityksiä, joilla ei ole verkkosivua tai joiden sivu on vanhentunut, rakentaa heille demosivun ja kirjoittaa yhteydenottoviestin. Sinä hyväksyt jokaisen viestin ennen kuin mitään lähtee.

## Asennus (kerran)

1. Asenna Node.js 20.6 tai uudempi ja Claude Code.
2. Tässä kansiossa: `npm install`
3. `cp .env.example .env` ja täytä avaimet:
   - **GOOGLE_PLACES_API_KEY**: Google Cloud Console → uusi projekti → ota käyttöön *Places API (New)* ja *PageSpeed Insights API* → Credentials → API key. Laita avaimeen rajoitus näihin kahteen rajapintaan.
   - **ANTHROPIC_API_KEY**: console.anthropic.com
   - **DEPLOY_CMD** (valinnainen): esim. Netlify tai Cloudflare Pages, alidomainiin `demo.hunmedia.fi`.
   - **SMTP-asetukset** (valinnainen): vain jos haluat lähettää sähköpostit suoraan täältä.
4. Muokkaa `config/haut.json`: kaupungit ja toimialat.

## Käyttö

Avaa kansio Claude Codessa (`claude`) ja kirjoita:

```
/liidikierros
```

Claude Code hakee liidit, rakentaa demot, tarkistaa ja korjaa ne, kirjoittaa viestit ja kysyy sinulta hyväksynnän. Sano esim. "hyväksy 1, 3 ja 4" ja sitten "lähetä".

Komennot myös käsin:

| Komento | Mitä tekee |
|---|---|
| `npm run kierros` | Koko putki ilman lähetystä |
| `npm run status` | Montako liidiä missäkin vaiheessa |
| `npm run approve -- slug1 slug2` | Hyväksyy yhteydenoton |
| `npm run send` | Lähettää hyväksytyt sähköpostit |
| `npm run set -- slug vastasi` | Päivittää tilan (esim. vastasi, asiakas, ei-kiinnosta) |
| `npm run prune` | Siivoaa vanhan Places-datan |

Katselmointisivu: `data/katselmointi.html`

## Hyvä tietää

- **Sähköpostit löytyvät vain vanhoilta sivuilta.** Yrityksille, joilla ei ole sivua, agentti kirjoittaa puhelun rungon ja tekstiviestin tai somen yksityisviestin. Ne hoidat itse; `npm run status` listaa ne.
- **Laki:** B2B-sähköpostimarkkinointi yrityksen osoitteisiin on Suomessa pääosin sallittua, kun viesti liittyy vastaanottajan työhön ja siinä on kieltäytymismahdollisuus (lisätään automaattisesti). Toiminimien henkilökohtaisten osoitteiden kanssa ole varovainen. En ole juristi, joten tarkista asia, jos volyymi kasvaa.
- **Kulut:** Places-haku maksaa muutamia senttejä, demo Claudella noin 10–30 senttiä. `BUILDS_PER_RUN` rajaa demojen määrän.
- **Demot** ovat noindex-merkittyjä, eivät käytä yrityksen kuvia ja kertovat olevansa Hunmedian ehdotus.
