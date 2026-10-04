import { z } from "zod";
import { generateJson, type GenerateJsonOptions } from "@/lib/ai/llm";
import type { Opinion } from "./tests";

// "Podsumuj opinie" for ROPS: what works, what to improve and a next step, from test ratings and
// reviews. Only the texts and scores go to the model, never people (CLAUDE.md rule 5);
// generateJson also redacts personal data. Shown with the "Propozycja AI" label.

export const FeedbackSummary = z.object({
  co_dziala: z.string().min(1).max(600),
  co_poprawic: z.string().min(1).max(600),
  nastepny_krok: z.string().min(1).max(400),
});
export type FeedbackSummary = z.infer<typeof FeedbackSummary>;

export const MIN_OPINIONS = 2;

export function opinionsForPrompt(opinions: Opinion[]): string {
  return opinions
    .slice(0, 60)
    .map((o, i) =>
      [
        `${i + 1}. Ocena ${o.ocena}/5.`,
        o.co_dzialalo ? `Działa: ${o.co_dzialalo}` : "",
        o.co_poprawic ? `Poprawić: ${o.co_poprawic}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
    .join("\n");
}

export async function summarizeFeedback(
  subject: string,
  opinions: Opinion[],
  options: GenerateJsonOptions = {},
): Promise<FeedbackSummary | null> {
  if (opinions.length < MIN_OPINIONS) return null;
  return generateJson(
    FeedbackSummary,
    [
      {
        role: "system",
        content:
          "You summarise residents' and institutions' feedback on a social innovation for the regional social policy " +
          "centre (ROPS). Write in plain Polish, short sentences, no English words. Use only what the opinions say; do not " +
          'invent numbers or facts. Return JSON: {"co_dziala": 1-2 sentences, "co_poprawic": 1-2 sentences naming the ' +
          'most frequent concrete improvement proposals, "nastepny_krok": one sentence with a practical next step for ROPS}.',
      },
      {
        role: "user",
        content: `Rozwiązanie: ${subject}\nOpinie (${opinions.length}):\n${opinionsForPrompt(opinions)}`,
      },
    ],
    { temperature: 0.2, maxTokens: 600, ...options },
  );
}
