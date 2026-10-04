import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { aiFixtures } from "@/lib/contracts/ai";
import { ideaCreatorFixtures } from "@/lib/contracts/idea-creator";
import { ApplicationDraft } from "./application-draft";
import { IdeaCard } from "./card-form";

vi.mock("../actions", () => ({ saveIdeaCard: vi.fn(), sendToRops: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/my/creator/x/card",
}));

const draft = { title: "Sąsiedzki dyżur", description: "Wolontariusze odwiedzają seniorów." };
const [seniors, incubator, access] = aiFixtures.callList.calls;
const seniorsArea = [{ id: "seniorzy", name: "Seniorzy" }];

describe("IdeaCard: four steps", () => {
  const html = renderToStaticMarkup(
    <IdeaCard
      idea={{ ...ideaCreatorFixtures.idea, status: null, komentarz: null, wyslany_at: null }}
      calls={aiFixtures.callList.calls.map((c) => ({ ...c, fit: "dowolny" as const }))}
      justSent={null}
    />,
  );

  it("shows the steps in order, each with what happens there", () => {
    const titles = [...html.matchAll(/<h2 id="step-[a-z]+-title"[^>]*>(.*?)<\/h2>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, ""),
    );
    expect(titles).toEqual([
      "Krok 1: Opisz pomysł",
      "Krok 2: Sprawdź, co poprawić",
      "Krok 3: Przygotuj wniosek o pieniądze (opcjonalnie)",
      "Krok 4: Wyślij do ROPS",
    ]);
    expect(html).toContain("Nabór to konkurs");
    expect(html).toContain('href="#step-funding"');
  });

  it("keeps unusual approaches as an option inside the check step", () => {
    expect(html).toMatch(/<details[^>]*><summary[^>]*>Szukasz innego sposobu/);
    expect(html.indexOf("Szukasz innego sposobu")).toBeGreaterThan(html.indexOf(`id="step-check"`));
    expect(html.indexOf("Szukasz innego sposobu")).toBeLessThan(html.indexOf(`id="step-funding"`));
  });
});

describe("ApplicationDraft: calls for the idea", () => {
  it("names the idea's area and marks the fitting call", () => {
    const html = renderToStaticMarkup(
      <ApplicationDraft
        calls={[
          { ...seniors, fit: "pasuje" },
          { ...incubator, fit: "dowolny" },
          { ...access, fit: "inny" },
        ]}
        areas={seniorsArea}
        draft={draft}
      />,
    );
    expect(html).toContain("Twój pomysł dotyczy obszaru: <strong>Seniorzy</strong>");
    expect(html).toContain(`${seniors.name} (pasuje do Twojego pomysłu)`);
    expect(html).toContain("Pasuje do obszaru Twojego pomysłu");
    expect(html).not.toContain("Teraz nie ma naboru dla obszaru");
  });

  it("says when no call fits and offers to ask ROPS", () => {
    const html = renderToStaticMarkup(
      <ApplicationDraft calls={[{ ...access, fit: "inny" }]} areas={seniorsArea} draft={draft} />,
    );
    expect(html).toContain("Teraz nie ma naboru dla obszaru Twojego pomysłu");
    expect(html).toContain('href="/my/messages/new?topic=');
    expect(html).toContain("Ten nabór dotyczy innego obszaru");
  });
});
