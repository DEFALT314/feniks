import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, demoAccount, isDemoMode } from "./demo-accounts";

describe("demo accounts", () => {
  it("cover the five roles from the mockup", () => {
    expect(DEMO_ACCOUNTS.map((a) => a.role)).toEqual([
      "mieszkaniec",
      "jst",
      "ngo",
      "ekspert",
      "rops_admin",
    ]);
  });

  it("use undeliverable example.org addresses and unique keys", () => {
    for (const a of DEMO_ACCOUNTS) expect(a.email).toMatch(/@example\.org$/);
    expect(new Set(DEMO_ACCOUNTS.map((a) => a.key)).size).toBe(DEMO_ACCOUNTS.length);
    expect(new Set(DEMO_ACCOUNTS.map((a) => a.email)).size).toBe(DEMO_ACCOUNTS.length);
  });

  it("land on in-app start pages", () => {
    for (const a of DEMO_ACCOUNTS) expect(a.startPath).toMatch(/^\/[a-z]/);
    expect(demoAccount("rops").startPath).toBe("/admin");
  });

  it("give institutions only to the municipality and the NGO", () => {
    expect(demoAccount("jst").institution?.typ).toBe("OPS");
    expect(demoAccount("ngo").institution?.typ).toBe("NGO");
    expect(demoAccount("mieszkaniec").institution).toBeUndefined();
  });

  it("isDemoMode is on only for DEMO_MODE=true", () => {
    expect(isDemoMode({ DEMO_MODE: "true" })).toBe(true);
    expect(isDemoMode({ DEMO_MODE: "1" })).toBe(false);
    expect(isDemoMode({})).toBe(false);
  });
});
