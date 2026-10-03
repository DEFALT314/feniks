import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Zasob } from "@/lib/contracts/zasobnik";
import { zasobyZPlikow } from "./z-plikow";

export const pobierzZasoby = cache(async (): Promise<Zasob[]> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return zasobyZPlikow();
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("resources").select("*");
  if (error || !data?.length) {
    console.error("Zasoby: baza niedostępna, używam data/rops", error?.message);
    return zasobyZPlikow();
  }
  return Zasob.array().parse(data);
});
