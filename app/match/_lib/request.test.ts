import { describe, expect, it, vi } from "vitest";
import fixture from "@/lib/contracts/fixtures/match.json";
import { buildRequest, fetchMatch, runTwoPhase, validate, type Phase } from "./request";

const values = {
  description: "  Tata wraca ze szpitala po udarze.  ",
  role: "mieszkaniec" as const,
  municipality: " ",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("buildRequest", () => {
  it("trims the description and leaves out an empty municipality", () => {
    expect(buildRequest(values, false)).toEqual({
      description: "Tata wraca ze szpitala po udarze.",
      role: "mieszkaniec",
      ai: false,
    });
    expect(buildRequest({ ...values, municipality: "Przykładowa Wola" }, true).municipality).toBe(
      "Przykładowa Wola",
    );
  });
});

describe("validate", () => {
  it("explains in plain Polish what is wrong", () => {
    expect(validate("pomoc")).toMatch(/co najmniej 10 znaków/);
    expect(validate("a".repeat(2001))).toMatch(/najwyżej 2000/);
    expect(validate("Samotni seniorzy na wsi")).toBeNull();
  });
});

describe("fetchMatch", () => {
  it("returns the validated response", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(fixture.response));
    expect(await fetchMatch(buildRequest(values, true), fetcher)).toEqual({
      ok: true,
      data: fixture.response,
    });
  });

  it("passes on the server's message (e.g. the rate limit)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(json({ error: "Za dużo zapytań. Spróbuj ponownie za 5 min." }, 429));
    expect(await fetchMatch(buildRequest(values, true), fetcher)).toEqual({
      ok: false,
      error: "Za dużo zapytań. Spróbuj ponownie za 5 min.",
    });
  });

  it("handles a broken connection and an unexpected answer", async () => {
    expect(
      (await fetchMatch(buildRequest(values, true), vi.fn().mockRejectedValue(new Error()))).ok,
    ).toBe(false);
    expect(
      (await fetchMatch(buildRequest(values, true), vi.fn().mockResolvedValue(json({ x: 1 })))).ok,
    ).toBe(false);
  });
});

describe("runTwoPhase", () => {
  const search = { ...fixture.response, picked_by: "search" };

  it("shows the ranking first, then the AI answer", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(search))
      .mockResolvedValueOnce(json(fixture.response));
    const phases: [Phase, string | undefined][] = [];
    await runTwoPhase(
      values,
      (p, d) => phases.push([p, d?.picked_by]),
      () => true,
      fetcher,
    );
    expect(phases).toEqual([
      ["searching", undefined],
      ["choosing", "search"],
      ["done", "ai"],
    ]);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).ai).toBe(false);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).ai).toBe(true);
  });

  it("keeps the ranking when the AI phase fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(search))
      .mockResolvedValueOnce(json({ error: "x" }, 500));
    const report = vi.fn();
    await runTwoPhase(values, report, () => true, fetcher);
    expect(report).toHaveBeenLastCalledWith("done", search, null);
  });

  it("reports an error when even the ranking fails", async () => {
    const report = vi.fn();
    await runTwoPhase(
      values,
      report,
      () => true,
      vi.fn().mockResolvedValue(json({ error: "Błąd." }, 400)),
    );
    expect(report).toHaveBeenLastCalledWith("error", null, "Błąd.");
  });

  it("drops answers that arrive after a newer search started", async () => {
    let current = true;
    const fetcher = vi.fn(async () => {
      current = false; // the user started another search meanwhile
      return json(search);
    });
    const report = vi.fn();
    await runTwoPhase(values, report, () => current, fetcher);
    expect(report).toHaveBeenCalledTimes(1); // only "searching"
  });
});
