import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/components/ui/navigation";
import { Role } from "@/lib/contracts/shared";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";
import { REQUESTABLE_LABELS, RequestableRole } from "@/app/my/profile/_lib/role-request";
import { decideRole } from "./actions";

export const metadata: Metadata = { title: "Prośby o rolę – Panel ROPS" };

type Row = {
  id: string;
  role: string;
  wnioskowana_rola: string;
  nazwa_wyswietlana: string | null;
  updated_at: string;
  instytucje: { nazwa: string } | null;
};

const time = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

// Role requests from /my/profile (#6). Profiles are readable by ROPS under RLS;
// only rops_admin can change a role (database guard profiles_guard_update).
export default async function Page({ searchParams }: PageProps<"/admin/roles">) {
  const { msg, ok } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, wnioskowana_rola, nazwa_wyswietlana, updated_at, instytucje(nazwa)")
    .not("wnioskowana_rola", "is", null)
    .order("updated_at", { ascending: true });
  const requests = ((data as unknown as Row[] | null) ?? []).filter(
    (r) => RequestableRole.safeParse(r.wnioskowana_rola).success,
  );

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <AdminNav current="/admin/roles" />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-8 sm:px-10">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight">Prośby o rolę</h1>
        <p className="text-muted-foreground max-w-[760px]">
          Organizacje, gminy i eksperci proszą o rolę w swoim profilu. Po zatwierdzeniu dostają
          dodatkowe narzędzia, a o decyzji informuje ich powiadomienie.
        </p>
        <p role="status" aria-live="polite" className="m-0 font-bold empty:hidden">
          {typeof msg === "string" ? (
            <span className={ok === "1" ? "text-success" : "text-danger"}>{msg}</span>
          ) : null}
        </p>

        {requests.length === 0 ? (
          <p className="border-border rounded-xl border bg-white p-6">
            Brak próśb do rozpatrzenia.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {requests.map((r) => {
              const current = Role.safeParse(r.role).data;
              const name = r.nazwa_wyswietlana ?? "Użytkownik bez nazwy";
              return (
                <li
                  key={r.id}
                  className="border-border flex flex-col gap-3 rounded-xl border bg-white p-6"
                >
                  <h2 className="m-0 text-xl font-bold">{name}</h2>
                  <p className="m-0">
                    prosi o rolę{" "}
                    <strong>„{REQUESTABLE_LABELS[r.wnioskowana_rola as RequestableRole]}”</strong>
                  </p>
                  <p className="text-muted-foreground m-0 flex flex-wrap items-center gap-2 text-base">
                    Teraz: <Badge>{current ? roleLabel(current) : r.role}</Badge>
                    {r.instytucje ? <span>· {r.instytucje.nazwa}</span> : null}
                    <span>· {time.format(new Date(r.updated_at))}</span>
                  </p>
                  <form action={decideRole} className="flex flex-wrap gap-2">
                    <input type="hidden" name="user_id" value={r.id} />
                    <Button type="submit" name="decision" value="approve">
                      Zatwierdź<span className="sr-only">: {name}</span>
                    </Button>
                    <Button type="submit" name="decision" value="reject" variant="secondary">
                      Odrzuć<span className="sr-only">: {name}</span>
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
