import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Category, type Innovation, type InnovationList } from "@/lib/contracts/knowledge-base";
import { innovationsFromRows } from "./row";
import { innovationsFromFiles, categoriesFromFiles } from "./from-files";
import {
  CATALOG_REVALIDATE_SECONDS,
  CATALOG_TAG,
  createPublicClient,
  isDatabaseConfigured,
} from "./public-client";

const catalogCache = { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS };

// Throwing (instead of returning an empty list) keeps a failed read out of the cache
async function rowsOrThrow<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error || !data?.length) throw new Error(error?.message ?? "brak danych");
  return data;
}

// Published innovations, shared by every visitor who is not a ROPS editor
const loadPublishedInnovations = unstable_cache(
  () => rowsOrThrow(createPublicClient().from("innovations").select("*").eq("opublikowana", true)),
  ["library-published-innovations"],
  catalogCache,
);

const loadCategories = unstable_cache(
  () =>
    rowsOrThrow(
      createPublicClient()
        .from("innovation_categories")
        .select("id, nazwa, url")
        .order("kolejnosc"),
    ),
  ["library-categories"],
  catalogCache,
);

// The whole catalog (about 160 items). ROPS editors also see unpublished cards, so they read it
// live with their session; everyone else gets the cached published list
export const getInnovations = cache(async (): Promise<Innovation[]> => {
  if (!isDatabaseConfigured()) return innovationsFromFiles();
  try {
    const user = await getCurrentUser();
    const rows = isRopsRole(user?.role)
      ? await rowsOrThrow((await createClient()).from("innovations").select("*"))
      : await loadPublishedInnovations();
    return innovationsFromRows(rows);
  } catch (e) {
    console.error("Zasobnik: baza niedostępna, używam data/rops", (e as Error).message);
    return innovationsFromFiles();
  }
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isDatabaseConfigured()) return categoriesFromFiles();
  try {
    return Category.array().parse(await loadCategories());
  } catch {
    return categoriesFromFiles();
  }
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
