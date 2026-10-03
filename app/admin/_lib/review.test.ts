import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { reviewIdea, type ReviewDeps } from "./review";

const IDEA = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  tytul: "Kawiarenka",
  autor_id: "author-1",
};
const EXPERT = "44444444-4444-4444-8444-444444444444";

function deps(
  opts: { idea?: typeof IDEA | null; insertError?: string; email?: string | null } = {},
) {
  const insert = vi.fn(async () => ({
    error: opts.insertError ? { message: opts.insertError } : null,
  }));
  const ideaQuery = {
    select: vi.fn(() => ideaQuery),
    eq: vi.fn(() => ideaQuery),
    not: vi.fn(() => ideaQuery),
    maybeSingle: vi.fn(async () => ({ data: opts.idea === undefined ? IDEA : opts.idea })),
  };
  const from = vi.fn((table: string) => (table === "ideas" ? ideaQuery : { insert }));
  const rpc = vi.fn(async () => ({
    data: opts.email === undefined ? "anna@gmail.com" : opts.email,
  }));
  const d: ReviewDeps = {
    supabase: { from, rpc } as unknown as SupabaseClient<Database>,
    writeAudit: vi.fn(async () => 1),
    addNotification: vi.fn(async () => 1),
    sendEmail: vi.fn(async () => ({ sent: true as const, id: "e1" })),
    siteUrl: "https://feniks-hub.vercel.app",
  };
  return { d, insert, from, rpc };
}

describe("reviewIdea", () => {
  it("saves an approval, logs it, notifies and e-mails the author", async () => {
    const { d, insert } = deps();

    const state = await reviewIdea(d, IDEA.id, { status: "zatwierdzony" });

    expect(state).toMatchObject({ status: "saved", emailSent: true });
    expect(insert).toHaveBeenCalledWith({
      idea_id: IDEA.id,
      status: "zatwierdzony",
      komentarz: null,
      ekspert_id: null,
    });
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "pomysl.ocena", obiekt: `ideas:${IDEA.id}` }),
    );
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ["author-1"],
        typ: "pomysl_oceniony",
        link: `/my/creator/${IDEA.id}`,
      }),
    );
    expect(d.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "anna@gmail.com",
        subject: "Zatwierdzony: Kawiarenka",
        action: {
          label: "Zobacz pomysł",
          url: `https://feniks-hub.vercel.app/my/creator/${IDEA.id}`,
        },
      }),
    );
  });

  it("requires a comment for changes and rejections", async () => {
    const { d, insert } = deps();

    const state = await reviewIdea(d, IDEA.id, { status: "odrzucony", komentarz: "   " });

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.komentarz).toMatch(/Napisz autorowi/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("requires an expert when passing the idea on, and notifies the expert", async () => {
    const missing = deps();
    expect(
      (await reviewIdea(missing.d, IDEA.id, { status: "w_weryfikacji" })).fieldErrors?.ekspert_id,
    ).toMatch(/eksperta/);

    const { d } = deps();
    await reviewIdea(d, IDEA.id, { status: "w_weryfikacji", ekspert_id: EXPERT });
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [EXPERT], typ: "pomysl_przekazany" }),
    );
  });

  it("rejects an unknown decision and an idea that was not sent", async () => {
    expect(
      (await reviewIdea(deps().d, IDEA.id, { status: "nowy" })).fieldErrors?.status,
    ).toBeDefined();
    const notSent = await reviewIdea(deps({ idea: null }).d, IDEA.id, { status: "zatwierdzony" });
    expect(notSent).toMatchObject({ status: "error", message: "Nie znaleziono tego pomysłu." });
  });

  it("reports a database error without side effects", async () => {
    const { d } = deps({ insertError: "permission denied" });

    const state = await reviewIdea(d, IDEA.id, { status: "zatwierdzony" });

    expect(state.status).toBe("error");
    expect(d.writeAudit).not.toHaveBeenCalled();
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the decision when the audit, notification or e-mail fails", async () => {
    const { d } = deps({ email: null });
    d.writeAudit = vi.fn(async () => {
      throw new Error("audit down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await reviewIdea(d, IDEA.id, {
      status: "do_poprawy",
      komentarz: "Dopisz koszty",
    });

    expect(state).toMatchObject({ status: "saved", emailSent: false });
    expect(d.sendEmail).not.toHaveBeenCalled();
  });
});
