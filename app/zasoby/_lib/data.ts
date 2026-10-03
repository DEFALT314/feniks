import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Resource } from "@/lib/contracts/knowledge-base";
import { resourcesFromFiles } from "./from-files";

export const getResources = cache(async (): Promise<Resource[]> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return resourcesFromFiles();
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("resources").select("*");
  if (error || !data?.length) {
    console.error("Zasoby: baza niedostępna, używam data/rops", error?.message);
    return resourcesFromFiles();
  }
  return Resource.array().parse(data);
});
