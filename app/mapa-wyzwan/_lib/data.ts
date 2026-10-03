import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ChallengeArea, Persona, Challenge } from "@/lib/contracts/knowledge-base";
import { challengeAreasFromFiles, type FullChallengeArea } from "./from-files";

const isDatabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 8 areas with challenges and personas, in the Challenges Map order
export const getChallengeAreas = cache(async (): Promise<FullChallengeArea[]> => {
  if (!isDatabaseConfigured()) return challengeAreasFromFiles();
  const supabase = await createClient();
  const [areas, challenges, personas] = await Promise.all([
    supabase.from("challenge_areas").select("*").order("nr"),
    supabase.from("challenges").select("id, obszar_id, tekst").order("kolejnosc"),
    supabase.from("personas").select("*").order("id"),
  ]);
  if (areas.error || challenges.error || personas.error || !areas.data?.length) {
    console.error("Mapa Wyzwań: baza niedostępna, używam data/rops");
    return challengeAreasFromFiles();
  }
  const c = Challenge.array().parse(challenges.data);
  const p = Persona.array().parse(personas.data);
  return ChallengeArea.array()
    .parse(areas.data)
    .map((a) => ({
      ...a,
      wyzwania: c.filter((x) => x.obszar_id === a.id),
      persony: p.filter((x) => x.obszar_id === a.id),
    }));
});
