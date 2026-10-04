import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ togglePublishedAction: vi.fn() }));

const { toggleMessage } = await import("./toggle-published-form");

describe("toggleMessage", () => {
  it("says the new state of the call by name", () => {
    expect(toggleMessage("Seniorzy 2027", true)).toBe("Nabór „Seniorzy 2027” jest włączony.");
    expect(toggleMessage("Seniorzy 2027", false)).toBe("Nabór „Seniorzy 2027” jest wyłączony.");
  });
});
