// Facts from the author's canvas (22 questions, data/rops/canvas_innowacji.json) for "Sprawdź fiszkę"
// and the application draft. The checks here are computed from the answers, not by AI: they are
// always true to what the author chose, and each one points to the canvas question it comes from.
import { describeAnswer, fields, isAnswered } from "@/app/my/creator/_lib/canvas";
import type { IdeaDraft, ReviewCheck } from "@/lib/contracts/ai";
import type { CanvasAnswer } from "@/lib/contracts/idea-creator";

export type Answers = Record<string, CanvasAnswer>;

export type CanvasFact = { step: string; label: string; question: string; answer: string };

// Every answered question as one line of plain text, in canvas order.
export function canvasFacts(answers: Answers): CanvasFact[] {
  return fields.flatMap((f) => {
    const a = answers[f.id];
    return a && isAnswered(a)
      ? [{ step: f.id, label: f.nazwa, question: f.pytanie ?? f.nazwa, answer: describeAnswer(a) }]
      : [];
  });
}

export const CANVAS_TOTAL = fields.length;

const choice = (answers: Answers, id: string): string | null => {
  const a = answers[id];
  return a && "choice" in a && a.choice ? a.choice : null;
};
const choices = (answers: Answers, id: string): string[] => {
  const a = answers[id];
  return a && "choices" in a ? a.choices.filter((c) => c !== "inne") : [];
};
const items = (answers: Answers, id: string): string[] => {
  const a = answers[id];
  return a && "items" in a ? a.items.map((i) => i.trim()).filter(Boolean) : [];
};

function fromCanvas(
  answers: Answers,
  step: string,
  check: Omit<ReviewCheck, "source" | "step" | "ai" | "suggestion"> & {
    suggestion?: string | null;
  },
): ReviewCheck {
  const field = fields.find((f) => f.id === step)!;
  const a = answers[step];
  return {
    suggestion: null,
    ...check,
    step,
    source: {
      kind: "kanwa",
      step,
      label: field.nazwa,
      answer: a && isAnswered(a) ? describeAnswer(a) : "brak odpowiedzi",
    },
    ai: false,
  };
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (xs: string[]) =>
  xs.length > 1 ? `${xs.slice(0, -1).join(", ")} i ${xs.at(-1)}` : (xs[0] ?? "");

// Checks computed from the card and the canvas: missing card fields, risky canvas answers and
// strong points worth saying out loud. Most important first.
export function ruleChecks(idea: IdeaDraft, answers: Answers): ReviewCheck[] {
  const out: ReviewCheck[] = [];

  // --- missing card fields ---
  if (idea.description.trim().length < 40) {
    out.push({
      id: "opis-krotki",
      kind: "brakuje",
      title: idea.description.trim() ? "Rozwiń opis" : "Opisz pomysł",
      detail:
        "Z opisu ma wynikać, jaki problem rozwiązujesz i co konkretnie robisz. To pierwsze, co czyta ROPS.",
      field: "description",
      step: null,
      suggestion: null,
      source: { kind: "fiszka", field: "description" },
      ai: false,
    });
  }
  if (!idea.audience) {
    const users = choices(answers, "glowny-uzytkownik");
    out.push({
      id: "pusty-dla-kogo",
      kind: "brakuje",
      title: "Napisz, dla kogo jest pomysł",
      detail: users.length
        ? `Pole „Dla kogo” jest puste, a w kanwie wskazałeś: ${users.join(", ")}. Przenieś to do fiszki.`
        : "Pole „Dla kogo” jest puste. ROPS i grantodawca najpierw sprawdzają, komu dokładnie pomagasz.",
      field: "audience",
      step: null,
      suggestion: users.length
        ? `${users.join(", ")}.`.replace(/^./, (c) => c.toUpperCase())
        : null,
      source: { kind: "fiszka", field: "audience" },
      ai: false,
    });
  }
  if (!idea.essence) {
    out.push({
      id: "pusta-istota",
      kind: "brakuje",
      title: "Dopisz istotę w jednym zdaniu",
      detail:
        "Jedno zdanie o tym, co zmienia się dla ludzi. Na liście pomysłów w ROPS widać właśnie je.",
      field: "essence",
      step: null,
      suggestion: null,
      source: { kind: "fiszka", field: "essence" },
      ai: false,
    });
  }

  // --- canvas: who pays ---
  const income = choice(answers, "glowny-dochod");
  const payers = choices(answers, "klient-platnik");
  if (income === "Nie wiemy jeszcze" || (!payers.length && answers["glowny-dochod"])) {
    out.push(
      fromCanvas(answers, payers.length ? "glowny-dochod" : "klient-platnik", {
        id: "kto-zaplaci",
        kind: "brakuje",
        title: "Nie wiadomo, kto zapłaci",
        detail:
          "Grantodawca zapyta, co stanie się po zakończeniu projektu. Wskaż choć jedno źródło pieniędzy, np. gminę, fundację albo nabór ROPS.",
        field: null,
      }),
    );
  }

  // --- canvas: value for money ---
  if (choice(answers, "wartosc-vs-koszt") === "Koszt większy niż korzyść") {
    out.push(
      fromCanvas(answers, "wartosc-vs-koszt", {
        id: "koszt-wiekszy",
        kind: "do_przemyslenia",
        title: "Koszt większy niż korzyść – co to zmieni?",
        detail:
          "Tak oceniasz to w kanwie. Napisz, co obniży koszt (np. wolontariusze, sprzęt od partnera) albo jakiej korzyści jeszcze nie opisałeś.",
        field: "essence",
      }),
    );
  }

  // --- canvas: clarity ---
  const clarity = choice(answers, "prostota");
  if (clarity === "Niejasne" || clarity === "Częściowo jasne") {
    out.push(
      fromCanvas(answers, "prostota", {
        id: "niejasne",
        kind: "do_przemyslenia",
        title: "Uprość opis",
        detail: `W kanwie piszesz, że pomysł jest dla nowej osoby ${lower(clarity)}. Spróbuj opisu w trzech zdaniach: problem, co robicie, co się zmienia.`,
        field: "description",
      }),
    );
  }

  // --- canvas: partners ---
  const partners = answers["partnerzy"];
  if (partners && "partners" in partners && partners.partners.length) {
    const confirmed = partners.partners.filter((p) => p.status === "potwierdzony");
    if (!confirmed.length) {
      out.push(
        fromCanvas(answers, "partnerzy", {
          id: "partnerzy-niepotwierdzeni",
          kind: "do_przemyslenia",
          title: "Żaden partner nie jest jeszcze potwierdzony",
          detail: `W kanwie są ${list(partners.partners.map((p) => p.name))}, ale bez potwierdzenia. List intencyjny od jednego z nich wzmocni wniosek.`,
          field: null,
        }),
      );
    }
  } else if (Object.keys(answers).length >= 5) {
    out.push(
      fromCanvas(answers, "partnerzy", {
        id: "brak-partnerow",
        kind: "do_przemyslenia",
        title: "Dopisz partnerów",
        detail:
          "Kto pomoże zrobić to taniej albo dotrzeć do ludzi? Ośrodek pomocy, szkoła, parafia, koło gospodyń – nawet jeden partner się liczy.",
        field: null,
      }),
    );
  }

  // --- canvas: who may block ---
  const blockers = items(answers, "utrudniaja-zmiane");
  if (blockers.length) {
    out.push(
      fromCanvas(answers, "utrudniaja-zmiane", {
        id: "kto-blokuje",
        kind: "do_przemyslenia",
        title: `Jak przekonasz: ${list(blockers.slice(0, 2))}?`,
        detail:
          "W kanwie wskazałeś, kto może się bać zmiany. Jedno zdanie o tym, jak ich przekonacie, pokazuje, że plan jest przemyślany.",
        field: "description",
      }),
    );
  }

  // --- strong points ---
  const intensity = choice(answers, "intensywnosc");
  const frequency = choice(answers, "czestotliwosc");
  if (intensity === "Bardzo poważny problem" || intensity === "Mocno przeszkadza") {
    out.push(
      fromCanvas(answers, "intensywnosc", {
        id: "mocny-problem",
        kind: "mocna_strona",
        title: "Mocny argument: problem jest poważny",
        detail: `W kanwie: „${intensity}”${frequency ? `, ${lower(frequency)}` : ""}. Napisz to wprost w pierwszym zdaniu opisu.`,
        field: "description",
      }),
    );
  }
  const value = choice(answers, "wartosc-vs-koszt");
  if (value === "Bardzo duża wartość przy małym koszcie" || value === "Korzyść większa niż koszt") {
    out.push(
      fromCanvas(answers, "wartosc-vs-koszt", {
        id: "tanie-i-skuteczne",
        kind: "mocna_strona",
        title: "Mocny argument: korzyść większa niż koszt",
        detail: "Gminy i grantodawcy szukają właśnie tego. Pokaż w istocie, co ludzie zyskują.",
        field: "essence",
      }),
    );
  }

  const order = { brakuje: 0, do_przemyslenia: 1, mocna_strona: 2 } as const;
  return out.sort((a, b) => order[a.kind] - order[b.kind]);
}
