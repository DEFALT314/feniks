import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import {
  formatAverage,
  getFeedbackSummary,
  getMyReview,
  opinionsLabel,
} from "@/lib/innovation-feedback";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

/**
 * Tester on a Library card (module IV): the average from reviews and tests, open tests to join and
 * "Oceń to rozwiązanie". Drop into app/library/[id]/page.tsx: <InnovationFeedback innovationId={i.id} />
 */
export async function InnovationFeedback({ innovationId }: { innovationId: string }) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  const [summary, mine] = await Promise.all([
    getFeedbackSummary(supabase, innovationId),
    user ? getMyReview(supabase, innovationId, user.id) : Promise.resolve(null),
  ]);

  return (
    <section
      aria-labelledby="feedback-heading"
      className="border-line flex flex-col gap-3 rounded-xl border bg-white p-6"
    >
      <h2 id="feedback-heading" className="text-[1.1875rem] font-bold">
        Oceny i testy
      </h2>
      <p className="text-base">
        {summary.count > 0 && summary.average != null ? (
          <>
            <strong className="text-2xl">{formatAverage(summary.average)}</strong> na 5 ·{" "}
            {opinionsLabel(summary.count)} mieszkańców i instytucji
          </>
        ) : (
          "Nikt jeszcze nie ocenił tego rozwiązania."
        )}
      </p>

      {summary.openTests.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Trwa test tego rozwiązania</h3>
          <ul className="flex flex-col gap-2">
            {summary.openTests.map((t) => (
              <li key={t.id} className="flex flex-col gap-1">
                <span className="text-base">
                  {t.tytul}
                  {t.termin ? ` · ${DATE.format(new Date(t.termin))}` : ""}
                  {t.miejsce ? ` · ${t.miejsce}` : ""}
                </span>
                <Link
                  href={`/my/tester#test-${t.id}`}
                  className={`${buttonVariants({ size: "sm" })} self-start`}
                >
                  Zgłoś się do testu<span className="sr-only">: {t.tytul}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {user ? (
        <ReviewForm innovationId={innovationId} mine={mine} />
      ) : (
        <p className="text-base">
          Korzystasz z tego rozwiązania albo je znasz?{" "}
          <Link href={`/login?next=${encodeURIComponent(`/library/${innovationId}`)}`}>
            Zaloguj się
          </Link>
          , żeby je ocenić i zaproponować usprawnienie.
        </p>
      )}
    </section>
  );
}
