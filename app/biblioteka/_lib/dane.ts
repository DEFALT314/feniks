import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Kategoria, type Innowacja, type ListaInnowacji } from "@/lib/contracts/zasobnik";
import { innowacjaZWiersza } from "./wiersz";
import { innowacjeZPlikow, kategorieZPlikow } from "./z-plikow";

const bazaSkonfigurowana = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Cały katalog na jedno żądanie (ok. 160 pozycji); RLS zwraca tylko to, co użytkownik może widzieć
export const pobierzInnowacje = cache(async (): Promise<Innowacja[]> => {
  if (!bazaSkonfigurowana()) return innowacjeZPlikow();
  const supabase = await createClient();
  const { data, error } = await supabase.from("innovations").select("*");
  if (error || !data?.length) {
    console.error("Zasobnik: baza niedostępna, używam data/rops", error?.message);
    return innowacjeZPlikow();
  }
  return data.map(innowacjaZWiersza);
});

export const pobierzKategorie = cache(async (): Promise<Kategoria[]> => {
  if (!bazaSkonfigurowana()) return kategorieZPlikow();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("innovation_categories")
    .select("id, nazwa, url")
    .order("kolejnosc");
  if (error || !data?.length) return kategorieZPlikow();
  return Kategoria.array().parse(data);
});

export async function pobierzInnowacjePoId(id: string): Promise<Innowacja | null> {
  return (await pobierzInnowacje()).find((i) => i.id === id) ?? null;
}

export async function dostepneFiltry(): Promise<ListaInnowacji["dostepne_filtry"]> {
  const [innowacje, kategorie] = await Promise.all([pobierzInnowacje(), pobierzKategorie()]);
  const uzyte = new Set(innowacje.map((i) => i.kategoria_id));
  return {
    kategorie: kategorie.filter((k) => uzyte.has(k.id)),
    grupy: [...new Set(innowacje.flatMap((i) => i.dla_kogo))].sort((a, b) =>
      a.localeCompare(b, "pl"),
    ),
    etykiety: [...new Set(innowacje.flatMap((i) => (i.etykieta ? [i.etykieta] : [])))].sort(),
  };
}
