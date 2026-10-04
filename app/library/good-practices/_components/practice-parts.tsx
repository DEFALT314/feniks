import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GoodPractice } from "@/lib/contracts/idea-creator";
import { ratingSummary, stageLabel } from "../../_lib/good-practices-format";

// Shared pieces of the good-practice pages (#104), in the Library's look
// (design/makiety/Biblioteka.dc.html; theme tokens from app/globals.css).

export const LINK = "text-navy underline underline-offset-[3px] hover:text-navy-strong";
// A link that stands on its own line gets a 44px target (project rule 7)
export const TARGET = "inline-flex min-h-11 items-center";

/** Breadcrumb: Biblioteka › Dobre praktyki mieszkańców (› the practice). */
export function PracticesTrail({ current }: { current?: string }) {
  return (
    <nav aria-label="Ścieżka" className="text-base">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        <li className="flex items-center gap-1.5">
          <Link href="/library" className={`${LINK} ${TARGET}`}>
            Biblioteka
          </Link>
          <span aria-hidden="true">›</span>
        </li>
        {current ? (
          <>
            <li className="flex items-center gap-1.5">
              <Link href="/library/good-practices" className={`${LINK} ${TARGET}`}>
                Dobre praktyki mieszkańców
              </Link>
              <span aria-hidden="true">›</span>
            </li>
            <li aria-current="page" className="text-ink-muted">
              {current}
            </li>
          </>
        ) : (
          <li aria-current="page" className="text-ink-muted">
            Dobre praktyki mieszkańców
          </li>
        )}
      </ol>
    </nav>
  );
}

// Tested ("przetestowane", "gotowe") reads as a success; earlier stages stay neutral
export function StageBadge({ stage }: { stage: GoodPractice["etap"] }) {
  const label = stageLabel(stage);
  if (!label) return null;
  const tested = stage === "przetestowane" || stage === "gotowe";
  return <Badge variant={tested ? "success" : "neutral"}>{label}</Badge>;
}

/** "9 ocen mieszkańców, średnio 4,6 na 5" with a star; nothing before the first rating. */
export function Ratings({ practice, className }: { practice: GoodPractice; className?: string }) {
  const summary = ratingSummary(practice.liczba_ocen, practice.srednia_ocena);
  if (!summary) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <Star aria-hidden="true" className="text-warning size-[1.1em] shrink-0 fill-current" />
      {summary}
    </span>
  );
}
