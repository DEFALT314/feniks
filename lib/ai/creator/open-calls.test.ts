import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { openCalls } = await import("./open-calls");
const { CALLS } = await import("./creator");

const published = {
  id: "nabor-nowy",
  name: "Nowy nabór ROPS",
  organizer: "ROPS",
  goal: "Cel",
  deadline: null,
  demo: false,
};

describe("openCalls", () => {
  it("returns the calls ROPS published", async () => {
    expect(await openCalls(async () => [published])).toEqual([published]);
  });

  it("an empty list stays empty: no call is open right now", async () => {
    expect(await openCalls(async () => [])).toEqual([]);
  });

  it("falls back to the demo calls when the database can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await openCalls(async () => {
        throw new Error("down");
      }),
    ).toEqual(CALLS);
  });
});
