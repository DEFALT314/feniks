import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Category, type Innovation, type InnovationList } from "@/lib/contracts/knowledge-base";
import { innovationsFromRows } from "./row";
import { innovationsFromFiles, categoriesFromFiles } from "./from-files";

const isDatabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// The whole catalog per request (about 160 items); RLS returns only what the user may see
export const getInnovations = cache(async (): Promise<Innovation[]> => {
  if (!isDatabaseConfigured()) return innovationsFromFiles();
  const supabase = await createClient();
  const { data, error } = await supabase.from("innovations").select("*");
  if (error || !data?.length) {
    console.error("Zasobnik: baza niedostępna, używam data/rops", error?.message);
    return innovationsFromFiles();
  }
  return innovationsFromRows(data);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isDatabaseConfigured()) return categoriesFromFiles();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("innovation_categories")
    .select("id, nazwa, url")
    .order("kolejnosc");
  if (error || !data?.length) return categoriesFromFiles();
  return Category.array().parse(data);
});

export async function getInnovationById(id: string): Promise<Innovation | null> {
  return (await getInnovations()).find((i) => i.id === id) ?? null;
}

export async function getAvailableFilters(): Promise<InnovationList["dostepne_filtry"]> {
  const [innovations, categories] = await Promise.all([getInnovations(), getCategories()]);
  const used = new Set(innovations.map((i) => i.kategoria_id));
  return {
    kategorie: categories.filter((k) => used.has(k.id)),
    grupy: [...new Set(innovations.flatMap((i) => i.dla_kogo))].sort((a, b) =>
      a.localeCompare(b, "pl"),
    ),
    etykiety: [...new Set(innovations.flatMap((i) => (i.etykieta ? [i.etykieta] : [])))].sort(),
  };
}
