import type { Metadata } from "next";
import { MatchForm } from "./_components/match-form";

// Module I, Matchmaking (P3). Mockup: design/makiety/Dopasuj.dc.html. API: POST /api/match.

export const metadata: Metadata = { title: "Dopasuj rozwiązanie – HubMI" };

type Props = { searchParams: Promise<{ description?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  // /challenge-map links here with ?description=… (persona descriptions)
  const { description } = await searchParams;
  const initial = (Array.isArray(description) ? description[0] : description) ?? "";
  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <MatchForm initialDescription={initial.slice(0, 2000)} />
    </main>
  );
}
