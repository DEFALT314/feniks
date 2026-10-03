import { EdycjaInnowacji, type Innowacja } from "@/lib/contracts/zasobnik";
import { innowacjaZWiersza } from "@/app/biblioteka/_lib/wiersz";

export const ROLE_ROPS = ["rops_redaktor", "rops_admin"] as const;

type Wynik = { status: number; body: Innowacja | { blad: string; szczegoly?: unknown } };

// Minimalny kształt klienta Supabase, którego używamy (łatwy do podmiany w testach)
export type KlientEdycji = {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
  rpc(fn: "moja_rola"): PromiseLike<{ data: unknown; error: unknown }>;
  from(tabela: "innovations"): {
    update(zmiany: Record<string, unknown>): {
      eq(
        kolumna: "id",
        wartosc: string,
      ): {
        select(): {
          maybeSingle(): PromiseLike<{
            data: unknown;
            error: { code?: string; message: string } | null;
          }>;
        };
      };
    };
  };
};

// Edycja karty innowacji z panelu ROPS. RLS w bazie i tak blokuje zapis innym rolom; tu dajemy czytelne błędy.
export async function edytujInnowacje(
  klient: KlientEdycji,
  id: string,
  dane: unknown,
): Promise<Wynik> {
  const { data: auth } = await klient.auth.getUser();
  if (!auth.user) return { status: 401, body: { blad: "Zaloguj się, aby edytować kartę." } };

  const { data: rola } = await klient.rpc("moja_rola");
  if (!ROLE_ROPS.includes(rola as (typeof ROLE_ROPS)[number])) {
    return {
      status: 403,
      body: { blad: "Kartę mogą edytować tylko redakcja i administracja ROPS." },
    };
  }

  const zmiany = EdycjaInnowacji.safeParse(dane);
  if (!zmiany.success) {
    return { status: 400, body: { blad: "Niepoprawne dane.", szczegoly: zmiany.error.issues } };
  }
  if (Object.keys(zmiany.data).length === 0) return { status: 400, body: { blad: "Brak zmian." } };

  const { data, error } = await klient
    .from("innovations")
    .update(zmiany.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error?.code === "23503") return { status: 400, body: { blad: "Nie ma takiej kategorii." } };
  if (error) return { status: 500, body: { blad: "Nie udało się zapisać zmian." } };
  if (!data) return { status: 404, body: { blad: "Nie ma takiej innowacji." } };
  return { status: 200, body: innowacjaZWiersza(data) };
}
