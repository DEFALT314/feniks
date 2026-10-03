import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewThreadForm } from "../_components/new-thread-form";
import { recipientOptions } from "../_lib/format";

export const metadata: Metadata = { title: "Nowa wiadomość – HubMI.pl" };

const param = (v: string | string[] | undefined, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

// New conversation. ROPS is in every conversation; the writer may also add an expert (mentor), an
// organisation or a municipality ("Do kogo"). Other modules can prefill it with a link, e.g. from
// /match: /my/messages/new?topic=Potrzeba%20w%20gminie&text=…  (also ?idea=<id>, ?innovation=<id>
// and ?to=<user id>, e.g. "Napisz do instytucji" from a service card)
export default async function NewMessagePage({ searchParams }: PageProps<"/my/messages/new">) {
  const p = await searchParams;
  const user = await getCurrentUser();
  const fromRops = Boolean(user && isRopsRole(user.role));
  const ideaId = param(p.idea, 64);
  let topic = param(p.topic, 200);
  const supabase = await createClient();
  const [{ data: contacts }, idea] = await Promise.all([
    supabase.rpc("contact_directory"),
    // "Napisz do ROPS o tym pomyśle" (idea card) has no title in the link: take it from the idea
    ideaId && !topic
      ? supabase.from("ideas").select("tytul").eq("id", ideaId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  topic ??= idea.data?.tytul;
  // An idea conversation is between ROPS and the author: no recipient choice there
  const options = ideaId ? null : recipientOptions(contacts ?? []);
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 pt-9 pb-16 sm:px-10"
    >
      <Link href="/my/messages" className="self-start text-base">
        ← Wiadomości
      </Link>
      <h1 className="font-heading text-[2.5rem] font-bold tracking-tight">Nowa wiadomość</h1>
      <p className="text-muted-foreground">
        {fromRops
          ? "Odbiorca dostanie powiadomienie w aplikacji i mailem. Odpowiedź zobaczysz w Wiadomościach."
          : "Zadaj pytanie albo opisz, czego potrzebujesz. Możesz napisać do zespołu ROPS, do eksperta (mentora) albo do organizacji lub gminy, z którą chcesz współpracować."}
      </p>
      <Card>
        <NewThreadForm
          topic={topic}
          text={param(p.text, 5000)}
          ideaId={ideaId}
          innovationId={param(p.innovation, 200)}
          toUserId={
            param(p.to, 64) ??
            // ?recipient=ekspert ("Zapytaj eksperta"): the first expert is chosen, the user can change it
            (p.recipient === "ekspert"
              ? contacts?.find((c) => c.rola === "ekspert")?.id
              : undefined)
          }
          recipients={options}
        />
      </Card>
    </main>
  );
}
