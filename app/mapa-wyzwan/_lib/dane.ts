import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Obszar, Persona, Wyzwanie } from "@/lib/contracts/zasobnik";
import { obszaryZPlikow, type ObszarPelny } from "./z-plikow";

const bazaSkonfigurowana = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 8 obszarów z wyzwaniami i personami, w kolejności z Mapy Wyzwań
export const pobierzObszary = cache(async (): Promise<ObszarPelny[]> => {
  if (!bazaSkonfigurowana()) return obszaryZPlikow();
  const supabase = await createClient();
  const [obszary, wyzwania, persony] = await Promise.all([
    supabase.from("challenge_areas").select("*").order("nr"),
    supabase.from("challenges").select("id, obszar_id, tekst").order("kolejnosc"),
    supabase.from("personas").select("*").order("id"),
  ]);
  if (obszary.error || wyzwania.error || persony.error || !obszary.data?.length) {
    console.error("Mapa Wyzwań: baza niedostępna, używam data/rops");
    return obszaryZPlikow();
  }
  const w = Wyzwanie.array().parse(wyzwania.data);
  const p = Persona.array().parse(persony.data);
  return Obszar.array()
    .parse(obszary.data)
    .map((o) => ({
      ...o,
      wyzwania: w.filter((x) => x.obszar_id === o.id),
      persony: p.filter((x) => x.obszar_id === o.id),
    }));
});
