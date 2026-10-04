import { describe, expect, it } from "vitest";
import {
  accountItemsFor,
  isActivePath,
  navItemsFor,
  notificationsBadge,
  notificationsLabel,
  roleLabel,
  withoutDuplicates,
} from "./navigation";

type RoleOrNull = Parameters<typeof navItemsFor>[0];
const hrefs = (role: RoleOrNull) => navItemsFor(role).map((i) => i.href);
const accountHrefs = (role: RoleOrNull) => accountItemsFor(role).map((i) => i.href);

describe("navItemsFor", () => {
  const PUBLIC = ["/match", "/library", "/challenge-map", "/resources"];

  it("shows only public pages to signed-out visitors", () => {
    expect(hrefs(null)).toEqual(PUBLIC);
  });

  it.each([
    ["mieszkaniec", "/my/creator"],
    ["ngo", "/my/creator"],
    ["jst", "/my/middleman"],
    ["ekspert", "/my/tester"],
  ] as const)("adds only the main task of %s, so the menu fits in one row", (role, task) => {
    expect(hrefs(role)).toEqual([...PUBLIC, task]);
  });

  it.each(["rops_redaktor", "rops_admin"] as const)("adds the ROPS panel for %s", (role) => {
    expect(hrefs(role)).toEqual([...PUBLIC, "/admin"]);
  });

  it.each(["mieszkaniec", "ngo", "jst", "ekspert"] as const)("has no ROPS panel for %s", (role) => {
    expect(hrefs(role)).not.toContain("/admin");
  });

  it("does not mutate the shared list between calls", () => {
    navItemsFor("rops_admin");
    expect(hrefs("mieszkaniec")).not.toContain("/admin");
  });
});

describe("withoutDuplicates", () => {
  it("drops account items the main menu already shows", () => {
    const left = withoutDuplicates(accountItemsFor("jst"), navItemsFor("jst")).map((i) => i.href);
    expect(left).toEqual(["/my/creator", "/my/tester", "/my/messages", "/my/profile"]);
  });
});

describe("accountItemsFor", () => {
  it("is empty for visitors", () => {
    expect(accountItemsFor(null)).toEqual([]);
  });

  it("lists personal pages and the profile for a resident", () => {
    expect(accountHrefs("mieszkaniec")).toEqual([
      "/my/creator",
      "/my/tester",
      "/my/messages",
      "/my/profile",
    ]);
  });

  it.each(["jst", "ngo"] as const)("adds the service card for %s", (role) => {
    expect(accountHrefs(role)).toContain("/my/middleman");
  });

  it.each(["ekspert", "rops_admin"] as const)("has no service card for %s", (role) => {
    expect(accountHrefs(role)).not.toContain("/my/middleman");
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
    expect(notificationsLabel(1)).toBe("Powiadomienia: 1 nowe");
    expect(notificationsLabel(2)).toBe("Powiadomienia: 2 nowe");
    expect(notificationsLabel(5)).toBe("Powiadomienia: 5 nowych");
    expect(notificationsLabel(12)).toBe("Powiadomienia: 12 nowych");
    expect(notificationsLabel(22)).toBe("Powiadomienia: 22 nowe");
  });

  it("caps the visible unread badge at 99+ so it never grows wider", () => {
    expect(notificationsBadge(7)).toBe("7");
    expect(notificationsBadge(99)).toBe("99");
    expect(notificationsBadge(100)).toBe("99+");
    expect(notificationsBadge(1234)).toBe("99+");
  });

  it("names roles in plain Polish", () => {
    expect(roleLabel("jst")).toBe("gmina (JST)");
    expect(roleLabel("rops_admin")).toBe("administracja ROPS");
  });
});
