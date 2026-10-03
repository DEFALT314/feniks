import { describe, expect, it } from "vitest";
import { adminFixtures, ReviewIdeaInput } from "./admin";
import { NewMessageInput, threadFixture } from "./messages";
import { NewNotification, notificationListFixture } from "./notifications";

// Fixtures are parsed on import, so importing them already checks them against the schema.
describe("P4 contracts", () => {
  it("fixtures pass validation", () => {
    expect(adminFixtures.kolejka.length).toBeGreaterThan(0);
    expect(threadFixture.wiadomosci.length).toBeGreaterThan(0);
    expect(notificationListFixture.nieprzeczytane).toBe(1);
  });

  it("an idea review cannot set the status to nowy", () => {
    expect(ReviewIdeaInput.safeParse({ status: "zatwierdzony" }).success).toBe(true);
    expect(ReviewIdeaInput.safeParse({ status: "nowy" }).success).toBe(false);
  });

  it("a message needs a thread or a subject", () => {
    expect(NewMessageInput.safeParse({ tresc: "Cześć" }).success).toBe(false);
    expect(NewMessageInput.safeParse({ temat: "Pytanie", tresc: "Cześć" }).success).toBe(true);
  });

  it("a notification needs recipients", () => {
    expect(NewNotification.safeParse({ typ: "x", tytul: "y" }).success).toBe(false);
    expect(NewNotification.safeParse({ typ: "x", tytul: "y", role: ["ekspert"] }).success).toBe(
      true,
    );
  });
});

describe("ReviewIdeaInput rules", () => {
  it("needs a comment for do_poprawy and odrzucony, and an expert for w_weryfikacji", () => {
    expect(ReviewIdeaInput.safeParse({ status: "do_poprawy" }).success).toBe(false);
    expect(
      ReviewIdeaInput.safeParse({ status: "do_poprawy", komentarz: "Dopisz koszty" }).success,
    ).toBe(true);
    expect(ReviewIdeaInput.safeParse({ status: "w_weryfikacji" }).success).toBe(false);
    expect(
      ReviewIdeaInput.safeParse({
        status: "w_weryfikacji",
        ekspert_id: "44444444-4444-4444-8444-444444444444",
      }).success,
    ).toBe(true);
  });
});
