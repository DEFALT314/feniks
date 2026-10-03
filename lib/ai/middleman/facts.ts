// Middleman facts computed from data, never by AI: does the institution fit the innovation's
// implementers, and which materials exist. Shown next to the AI draft so the user can check it.
import type { Innovation } from "@/lib/contracts/knowledge-base";
import type { InstitutionFit, InstitutionType, Material } from "@/lib/contracts/middleman";

export const INSTITUTION_LABELS: Record<InstitutionType, string> = {
  gops: "GOPS",
  mops: "MOPS",
  pcpr: "PCPR",
  urzad_gminy: "urząd gminy",
  dps: "DPS",
  ngo: "organizacja pozarządowa",
  inna: "instytucja",
};

// How implementers are described in the Library ("OPS", "JST", "gminne ośrodki pomocy społecznej"…).
const DIRECT: Record<InstitutionType, RegExp | null> = {
  gops: /\b(g?ops|mops)\b|ośrod\p{L}* pomocy|pomocy społecznej/iu,
  mops: /\b(m?ops|gops)\b|ośrod\p{L}* pomocy|pomocy społecznej/iu,
  pcpr: /\bpcpr\b|powiatow\p{L}* centr|\bpowiat/iu,
  urzad_gminy: /\bgmin|\bjst\b|samorząd|urząd/iu,
  dps: /\bdps\b|dom\p{L}* pomocy społecznej|domy opieki|zol\b/iu,
  ngo: /\bngo\b|organizacj\p{L}* pozarząd|fundacj|stowarzysz/iu,
  inna: null,
};
// Bodies that usually work with this institution type, so the fit is partial rather than none.
const RELATED: Record<InstitutionType, RegExp | null> = {
  gops: /\bjst\b|samorząd|\bgmin/iu,
  mops: /\bjst\b|samorząd|\bgmin|miejsk/iu,
  pcpr: /\bjst\b|samorząd|\bops\b/iu,
  urzad_gminy: /\b(g?ops|mops)\b|ośrod\p{L}* pomocy/iu,
  dps: /\b(g?ops|mops)\b|ośrod\p{L}* pomocy|opiek/iu,
  ngo: /podmiot\p{L}* ekonomii|wolontari|klub|stowarzysz/iu,
  inna: null,
};

export function institutionFit(innovation: Innovation, type: InstitutionType): InstitutionFit {
  const implementers = innovation.kto_moze_wdrozyc;
  const label = INSTITUTION_LABELS[type];
  const listed = implementers.length ? implementers.join(", ") : "brak informacji";
  const direct = DIRECT[type] ? implementers.filter((i) => DIRECT[type]!.test(i)) : [];
  if (direct.length) {
    return {
      level: "dobra",
      note: `Innowację wdrażają m.in.: ${direct.join(", ")}, więc pasuje do: ${label}.`,
    };
  }
  const related = RELATED[type] ? implementers.filter((i) => RELATED[type]!.test(i)) : [];
  if (related.length) {
    return {
      level: "czesciowa",
      note: `Wśród wdrażających są: ${related.join(", ")}. ${capitalize(label)} może ją prowadzić we współpracy z nimi.`,
    };
  }
  return {
    level: "do_sprawdzenia",
    note: `W opisie innowacji jako wdrażający są: ${listed}. Zapytaj ROPS, czy ${label} może ją prowadzić.`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function innovationMaterials(innovation: Innovation): Material[] {
  const m = innovation.materialy;
  const out: Material[] = [];
  if (m.opis_pdf) out.push({ label: "Opis innowacji (PDF)", url: m.opis_pdf });
  if (m.film) out.push({ label: "Film o innowacji", url: m.film });
  if (m.pakiet_zip) out.push({ label: "Pakiet materiałów do wdrożenia", url: m.pakiet_zip });
  if (m.zasady_wykorzystania)
    out.push({ label: "Zasady wykorzystania", url: m.zasady_wykorzystania });
  m.inne.forEach((url, n) => out.push({ label: `Materiał dodatkowy ${n + 1}`, url }));
  out.push({ label: "Karta innowacji w ROPS", url: innovation.url });
  return out;
}
