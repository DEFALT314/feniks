import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { NewThreadForm } from "../_components/new-thread-form";

export const metadata: Metadata = { title: "Napisz do ROPS – HubMI.pl" };

const param = (v: string | string[] | undefined, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

// New conversation with ROPS. Other modules can prefill it with a link, e.g. from /match:
// /my/messages/new?topic=Potrzeba%20w%20gminie&text=…  (also ?idea=<id> or ?innovation=<id>;
// ROPS only: ?to=<user id> adds that person, e.g. "Napisz do instytucji" from a service card)
export default async function NewMessagePage({ searchParams }: PageProps<"/my/messages/new">) {
  const p = await searchParams;
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 pt-9 pb-16 sm:px-10"
    >
      <Link href="/my/messages" className="self-start text-base">
        ← Wiadomości
      </Link>
      <h1 className="font-heading text-[2.5rem] font-bold tracking-tight">Napisz do ROPS</h1>
      <p className="text-muted-foreground">
        Zadaj pytanie albo opisz, czego potrzebujesz. Odpowie Ci ROPS. Jeśli trzeba, zaprosi do
        rozmowy eksperta.
      </p>
      <Card>
        <NewThreadForm
          topic={param(p.topic, 200)}
          text={param(p.text, 5000)}
          ideaId={param(p.idea, 64)}
          innovationId={param(p.innovation, 200)}
          toUserId={param(p.to, 64)}
        />
      </Card>
    </main>
  );
}
