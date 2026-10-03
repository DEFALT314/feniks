import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";
import type { CurrentUser, NavItem } from "./navigation";
import { SiteNav } from "./site-nav";
import { dropdownClass } from "./use-disclosure";

vi.mock("next/navigation", () => ({ usePathname: () => "/library" }));

const user: CurrentUser = { name: "Anna Nowak", role: "ngo" };
const items: NavItem[] = [
  { href: "/match", label: "Dopasuj" },
  { href: "/library", label: "Biblioteka" },
];

describe("dropdownClass", () => {
  it("maps each disclosure state to the .t-dropdown classes", () => {
    expect(dropdownClass("open")).toBe("t-dropdown is-open");
    expect(dropdownClass("closing")).toBe("t-dropdown is-closing");
    expect(dropdownClass("closed")).toBe("t-dropdown");
  });
});

describe("dropdown panels", () => {
  it("render closed: hidden from everyone and resting at the pre-open scale", () => {
    for (const html of [
      renderToStaticMarkup(<AccountMenu user={user} items={items} />),
      renderToStaticMarkup(<MobileMenu user={user} items={items} accountItems={items} />),
    ]) {
      const panel = html.match(/<div[^>]*class="t-dropdown [^"]*"[^>]*>/)?.[0] ?? "";
      expect(panel).toContain('hidden=""');
      expect(panel).not.toContain("is-open");
      expect(panel).not.toContain("inert");
    }
  });
});

describe("SiteNav", () => {
  const html = renderToStaticMarkup(<SiteNav items={items} />);

  it("keeps the active link's own underline until the sliding bar takes over", () => {
    const active = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? "";
    expect(active).toContain('href="/library"');
    expect(active).toContain("border-navy");
    expect(active).toContain("group-data-ready:border-transparent");
  });

  it("renders the sliding bar hidden from assistive technology", () => {
    expect(html).toMatch(/<span aria-hidden="true" class="t-tabs-bar"><\/span>/);
  });
});
