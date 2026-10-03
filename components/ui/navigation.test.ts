import { describe, expect, it } from "vitest";
import { isActivePath, navItemsFor, notificationsLabel, roleLabel } from "./navigation";

const hrefs = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).map((i) => i.href);

describe("navItemsFor", () => {
  it("shows only public pages to signed-out visitors", () => {
    expect(hrefs(null)).toEqual(["/match", "/library", "/challenge-map"]);
  });

  it("adds personal pages for a signed-in resident", () => {
    expect(hrefs("mieszkaniec")).toEqual([
      "/match",
      "/library",
      "/challenge-map",
      "/my/creator",
      "/my/tester",
      "/my/messages",
    ]);
  });

  it.each(["jst", "ngo"] as const)("adds the service card for %s", (role) => {
    expect(hrefs(role)).toContain("/my/middleman");
    expect(hrefs(role)).not.toContain("/admin");
  });

  it.each(["rops_redaktor", "rops_admin"] as const)("adds the ROPS panel for %s", (role) => {
    expect(hrefs(role)).toContain("/admin");
    expect(hrefs(role)).not.toContain("/my/middleman");
  });

  it("gives experts neither the service card nor the ROPS panel", () => {
    expect(hrefs("ekspert")).not.toContain("/admin");
    expect(hrefs("ekspert")).not.toContain("/my/middleman");
  });

  it("does not mutate the shared list between calls", () => {
    navItemsFor("rops_admin");
    expect(hrefs("mieszkaniec")).not.toContain("/admin");
  });
});

describe("isActivePath", () => {
  it("matches the page itself and pages below it", () => {
    expect(isActivePath("/library", "/library")).toBe(true);
    expect(isActivePath("/library/bawita", "/library")).toBe(true);
  });

  it("does not match a page that only shares a prefix", () => {
    expect(isActivePath("/library-old", "/library")).toBe(false);
    expect(isActivePath("/", "/library")).toBe(false);
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
