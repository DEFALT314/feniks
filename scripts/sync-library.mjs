// Syncs the ROPS Social Innovation Library -> data/biblioteka_raw.json
// Run from a laptop (not from a cloud server, ROPS blocks some bots):
//   npm i linkedom && node scripts/sync-library.mjs
// Fetches 9 categories and all innovation cards, splits the text into sections.
// Full texts are ROPS material: we show them in the app with a link to the source.
import { DOMParser } from 'linkedom';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/';
const CATS = [
  'dla-seniorow', 'dla-dzieci-mlodziezy-i-rodziny', 'dla-osob-o-ograniczonej-mobilnosci',
  'dla-osob-z-niepelnosprawnoscia-sensoryczna', 'dla-zdrowia-i-medycyny', 'dla-rynku-pracy',
  'dla-cudzoziemcow', 'dla-osob-w-kryzysie-bezdomnosci', 'dla-osob-z-niepelnosprawnoscia-intelektualna',
];
const H = {
  'Na czym polega rozwiązanie': 'rozwiazanie', 'Jakich problemów dotyczy innowacja': 'problem',
  'Grupa docelowa': 'grupa_docelowa', 'Kto może skorzystać z innowacji': 'kto_moze_skorzystac',
  'Czy to działa': 'czy_dziala', 'Autorzy': 'autorzy', 'Autorka': 'autorzy', 'Autor': 'autorzy',
};
const RE = /(?:^|\n)[ \t]*\d+\.[ \t]*(Na czym polega rozwiązanie|Jakich problemów dotyczy innowacja|Grupa docelowa|Kto może skorzystać z innowacji|Czy to działa|Autorzy|Autorka|Autor)\??[ \t]*:?[ \t]*(?=\n)/g;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HubMI-sync/0.1 (hackathon; kontakt: zespol)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await sleep(300); // be polite to the ROPS server
  return new DOMParser().parseFromString(await res.text(), 'text/html');
}
function sections(text) {
  const out = {};
  const ms = [...text.matchAll(RE)];
  ms.forEach((m, i) => {
    const s = m.index + m[0].length;
    const e = i + 1 < ms.length ? ms[i + 1].index : text.length;
    out[H[m[1]]] = text.slice(s, e).replace(/\s+/g, ' ').trim();
  });
  if (!ms.length) out.caly_tekst = text.replace(/\s+/g, ' ').trim();
  return out;
}
const abs = (href) => new URL(href, 'https://rops.krakow.pl/').href.replace('http:', 'https:');

const items = [];
for (const cat of CATS) {
  const d = await get(BASE + cat);
  const main = d.querySelector('.content__main') || d;
  const links = [...new Set([...main.querySelectorAll('a')]
    .map((a) => abs(a.getAttribute('href') || ''))
    .filter((h) => h.includes(cat + ',')))];
  for (const url of links) {
    const dd = await get(url);
    const mm = dd.querySelector('.content__main') || dd;
    const text = mm.querySelector('.text-content')?.textContent || '';
    const files = [...mm.querySelectorAll('a')]
      .map((a) => ({ tytul: a.textContent.replace(/\s+/g, ' ').trim(), url: abs(a.getAttribute('href') || '') }))
      .filter((f) => /\.(pdf|zip|docx?|pptx?)(\?|$)/i.test(f.url) || /youtu|vimeo/i.test(f.url));
    items.push({
      id: url.split(',').pop(),
      kategoria: cat,
      nazwa: mm.querySelector('.page-title')?.textContent.trim() || null,
      etykieta: (text.match(/INNOWACJA WYBRANA DO UPOWSZECHNIANIA[^\n]*/) || [null])[0]?.trim() || null,
      sekcje: sections(text),
      pliki: files,
      url,
      pobrano: new Date().toISOString(),
    });
    process.stdout.write('.');
  }
}
await mkdir('data', { recursive: true });
await writeFile('data/biblioteka_raw.json', JSON.stringify(items, null, 1));
console.log(`\n${items.length} innowacji -> data/biblioteka_raw.json`);
// NOTE: the "autorzy" section contains surnames. Do not show it in the demo without ROPS consent; keep only institutions in the seed.
