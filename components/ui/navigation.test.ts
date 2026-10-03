import { describe, expect, it } from "vitest";
import { isActivePath, navItemsFor, notificationsLabel, roleLabel } from "./navigation";

const hrefs = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).map((i) => i.href);

describe("navItemsFor", () => {
  it("shows only public pages to signed-out visitors", () => {
    expect(hrefs(null)).toEqual(["/dopasuj", "/biblioteka", "/mapa-wyzwan"]);
  });

  it("adds personal pages for a signed-in resident", () => {
    expect(hrefs("mieszkaniec")).toEqual([
      "/dopasuj",
      "/biblioteka",
      "/mapa-wyzwan",
      "/moje/kreator",
      "/moje/tester",
      "/moje/wiadomosci",
    ]);
  });

  it.each(["jst", "ngo"] as const)("adds the service card for %s", (role) => {
    expect(hrefs(role)).toContain("/moje/middleman");
    expect(hrefs(role)).not.toContain("/admin");
  });

  it.each(["rops_redaktor", "rops_admin"] as const)("adds the ROPS panel for %s", (role) => {
    expect(hrefs(role)).toContain("/admin");
    expect(hrefs(role)).not.toContain("/moje/middleman");
  });

  it("gives experts neither the service card nor the ROPS panel", () => {
    expect(hrefs("ekspert")).not.toContain("/admin");
    expect(hrefs("ekspert")).not.toContain("/moje/middleman");
  });

  it("does not mutate the shared list between calls", () => {
    navItemsFor("rops_admin");
    expect(hrefs("mieszkaniec")).not.toContain("/admin");
  });
});

describe("isActivePath", () => {
  it("matches the page itself and pages below it", () => {
    expect(isActivePath("/biblioteka", "/biblioteka")).toBe(true);
    expect(isActivePath("/biblioteka/bawita", "/biblioteka")).toBe(true);
  });

  it("does not match a page that only shares a prefix", () => {
    expect(isActivePath("/bibliotekarz", "/biblioteka")).toBe(false);
    expect(isActivePath("/", "/biblioteka")).toBe(false);
  });
});

describe("labels", () => {
  it("describes unread notifications for screen readers", () => {
    expect(notificationsLabel(0)).toBe("Powiadomienia: brak nowych");
    expect(notificationsLabel(2)).toBe("Powiadomienia: 2 nowe");
  });

  it("names roles in plain Polish", () => {
    expect(roleLabel("jst")).toBe("gmina (JST)");
    expect(roleLabel("rops_admin")).toBe("administracja ROPS");
  });
});
