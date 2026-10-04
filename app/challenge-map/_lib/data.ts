import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { ChallengeArea, Persona, Challenge } from "@/lib/contracts/knowledge-base";
import {
  CATALOG_REVALIDATE_SECONDS,
  CATALOG_TAG,
  createPublicClient,
  isDatabaseConfigured,
} from "@/app/library/_lib/public-client";
import { challengeAreasFromFiles, type FullChallengeArea } from "./from-files";

// The map is public and the same for everyone, so it is cached across requests. Throwing keeps
// a failed read out of the cache
const loadChallengeMap = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const [areas, challenges, personas] = await Promise.all([
      supabase.from("challenge_areas").select("*").order("nr"),
      supabase.from("challenges").select("id, obszar_id, tekst").order("kolejnosc"),
      supabase.from("personas").select("*").order("id"),
    ]);
    const error = areas.error ?? challenges.error ?? personas.error;
    if (error || !areas.data?.length) throw new Error(error?.message ?? "brak obszarów");
    return { areas: areas.data, challenges: challenges.data ?? [], personas: personas.data ?? [] };
  },
  ["challenge-map"],
  { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// 8 areas with challenges and personas, in the Challenges Map order
export const getChallengeAreas = cache(async (): Promise<FullChallengeArea[]> => {
  if (!isDatabaseConfigured()) return challengeAreasFromFiles();
  let rows: Awaited<ReturnType<typeof loadChallengeMap>>;
  try {
    rows = await loadChallengeMap();
  } catch (e) {
    console.error("Mapa Wyzwań: baza niedostępna, używam data/rops", (e as Error).message);
    return challengeAreasFromFiles();
  }
  const c = Challenge.array().parse(rows.challenges);
  const p = Persona.array().parse(rows.personas);
  return ChallengeArea.array()
    .parse(rows.areas)
    .map((a) => ({
      ...a,
      wyzwania: c.filter((x) => x.obszar_id === a.id),
      persony: p.filter((x) => x.obszar_id === a.id),
    }));
});
