// A new innovation card from the ROPS panel: it starts hidden, the editor fills it in and publishes it.
import { z } from "zod";
import { normalize } from "@/app/library/_lib/search";

export const NewCardInput = z.object({
  nazwa: z.string().trim().min(3, "Wpisz nazwę innowacji (co najmniej 3 znaki).").max(200),
  kategoria_id: z.string().trim().min(1, "Wybierz kategorię."),
});
export type NewCardInput = z.infer<typeof NewCardInput>;

// "Babcia w sieci!" → "babcia-w-sieci-k3x9": readable in the address, unique thanks to the suffix
export function newCardId(name: string, suffix: string): string {
  const slug = normalize(name).replace(/ /g, "-").slice(0, 60).replace(/-+$/, "");
  return `${slug || "innowacja"}-${suffix}`;
}

// The row to insert: hidden from the Library and from matching until ROPS publishes it
export function newCardRow(input: NewCardInput, suffix: string) {
  return {
    id: newCardId(input.nazwa, suffix),
    nazwa: input.nazwa,
    kategoria_id: input.kategoria_id,
    opublikowana: false,
    do_matchmakingu: false,
    sprawdzona_przez_rops: false,
    url: "",
    materialy: {
      opis_pdf: null,
      film: null,
      pakiet_zip: null,
      zasady_wykorzystania: null,
      inne: [] as string[],
    },
  };
}

// The typed values come back with an error: React resets the form after a server action
export type NewCardState =
  { status: "idle" } | { status: "error"; message: string; nazwa: string; kategoria_id: string };

export type NewCardDeps = {
  isRops: boolean;
  insert(row: ReturnType<typeof newCardRow>): Promise<{ error: { code?: string } | null }>;
  audit(id: string): Promise<unknown>;
  suffix(): string;
};

// Returns the new card's id, or a message for the form
export async function createCard(
  deps: NewCardDeps,
  input: unknown,
): Promise<{ id: string } | { message: string }> {
  if (!deps.isRops) return { message: "Karty mogą dodawać tylko redakcja i administracja ROPS." };
  const parsed = NewCardInput.safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const row = newCardRow(parsed.data, deps.suffix());
  const { error } = await deps.insert(row);
  if (error?.code === "23503") return { message: "Nie ma takiej kategorii." };
  if (error) return { message: "Nie udało się dodać karty. Spróbuj ponownie." };
  try {
    await deps.audit(row.id);
  } catch (e) {
    console.error("New card: audit log failed", e);
  }
  return { id: row.id };
}
