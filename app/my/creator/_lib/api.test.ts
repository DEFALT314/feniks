import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { postJson } from "./api";

const Schema = z.object({ value: z.number() });
const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("postJson", () => {
  it("returns data that matches the contract", async () => {
    expect(await postJson("/x", {}, Schema, reply(200, { value: 1 }))).toEqual({
      ok: true,
      data: { value: 1 },
    });
  });

  it("shows the endpoint's own error message", async () => {
    const result = await postJson("/x", {}, Schema, reply(429, { error: "Zbyt wiele zapytań." }));
    expect(result).toEqual({ ok: false, error: "Zbyt wiele zapytań." });
  });

  it("treats a response outside the contract as an error", async () => {
    expect((await postJson("/x", {}, Schema, reply(200, { value: "1" }))).ok).toBe(false);
  });

  it("reports a network failure in plain Polish", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await postJson("/x", {}, Schema, offline)).toEqual({
      ok: false,
      error: "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.",
    });
  });

  it("sends JSON", async () => {
    const f = reply(200, { value: 1 });
    await postJson("/api/ai/hints", { a: 1 }, Schema, f);
    expect(f).toHaveBeenCalledWith(
      "/api/ai/hints",
      expect.objectContaining({ method: "POST", body: '{"a":1}' }),
    );
  });
});
