import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// Klient z sesją zalogowanego użytkownika. Używaj w Server Components, Server Actions i endpointach.
// Działa z RLS, czyli widzi tylko to, na co pozwalają polityki.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Wywołanie z Server Component: ciasteczka odświeża proxy.ts.
          }
        },
      },
    },
  );
}
