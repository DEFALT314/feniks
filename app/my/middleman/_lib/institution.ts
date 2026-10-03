// Institution choices for /my/middleman and the mapping from P4's institutions table.
import type { InstitutionType as SharedInstitutionType } from "@/lib/contracts/shared";
import type {
  InstitutionProfile,
  InstitutionType,
  MunicipalityKind,
} from "@/lib/contracts/middleman";

export const TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
  { value: "gops", label: "GOPS – gminny ośrodek pomocy społecznej" },
  { value: "mops", label: "MOPS – miejski ośrodek pomocy społecznej" },
  { value: "pcpr", label: "PCPR – powiatowe centrum pomocy rodzinie" },
  { value: "urzad_gminy", label: "Urząd gminy" },
  { value: "dps", label: "Dom pomocy społecznej" },
  { value: "ngo", label: "Organizacja pozarządowa" },
  { value: "inna", label: "Inna instytucja" },
];

export const MUNICIPALITY_OPTIONS: { value: MunicipalityKind; label: string }[] = [
  { value: "wiejska", label: "Gmina wiejska" },
  { value: "miejsko-wiejska", label: "Gmina miejsko-wiejska" },
  { value: "miejska", label: "Gmina miejska" },
  { value: "powiat", label: "Powiat" },
];

const FROM_SHARED: Record<SharedInstitutionType, InstitutionType> = {
  gmina: "urzad_gminy",
  OPS: "gops",
  PCPR: "pcpr",
  NGO: "ngo",
  inna: "inna",
};

// Prefill from the signed-in user's institution (profiles.instytucja_id → instytucje).
export function defaultInstitution(
  row: { nazwa: string; typ: SharedInstitutionType } | null,
): InstitutionProfile {
  return {
    type: row ? FROM_SHARED[row.typ] : "gops",
    name: row?.nazwa.replace(/\s*\((fikcyjn[ay]|fikcyjne)\)\s*$/i, "") ?? "",
    municipality_kind: "wiejska",
  };
}

// Text areas edit lists one item per line.
export const toLines = (items: string[]) => items.join("\n");
export const fromLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•])\s*/, "").trim())
    .filter(Boolean);
