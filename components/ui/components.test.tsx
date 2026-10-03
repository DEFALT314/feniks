import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./badge";
import { buttonVariants } from "./button";
import { ChoiceTile } from "./choice-tile";
import { SiteHeader } from "./site-header";
import { Steps } from "./steps";

vi.mock("next/navigation", () => ({ usePathname: () => "/library/bawita" }));

// The opening <a> tag that links to href (attribute order is up to React)
function linkTag(html: string, href: string) {
  return html.match(new RegExp(`<a[^>]*href="${href}"[^>]*>`))?.[0] ?? "";
}

describe("buttonVariants", () => {
  it.each(["primary", "secondary", "tertiary", "destructive", "outline"] as const)(
    "gives the %s variant exactly one border color",
    (variant) => {
      const borderColors = buttonVariants({ variant })
        .split(" ")
        .filter((c) => /^border-(?!\d|\[)[a-z]/.test(c) && c !== "border");
      expect(borderColors).toHaveLength(1);
    },
  );

  it("uses touch-friendly heights", () => {
    expect(buttonVariants()).toContain("min-h-[50px]");
    expect(buttonVariants({ size: "sm" })).toContain("min-h-11");
  });
});

describe("Badge", () => {
  it("renders the AI label", () => {
    expect(renderToStaticMarkup(<Badge variant="ai">Propozycja AI</Badge>)).toContain(
      "Propozycja AI",
    );
  });
});

describe("Steps", () => {
  it("marks only the current step", () => {
    const html = renderToStaticMarkup(
      <Steps
        label="Części kanwy"
        currentId="problem"
        steps={[
          { id: "problem", label: "Problem", href: "#problem", done: 0, total: 3 },
          { id: "koszty", label: "Koszty", href: "#koszty", done: 1, total: 2 },
        ]}
      />,
    );
    expect(html).toContain('aria-label="Części kanwy"');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(linkTag(html, "#problem")).toContain('aria-current="step"');
  });
});

describe("ChoiceTile", () => {
  it("wraps a real radio input in its label", () => {
    const html = renderToStaticMarkup(
      <ChoiceTile name="severity" value="hard" title="Utrudnia działanie" description="Opis" />,
    );
    expect(html).toMatch(/^<label[^>]*><input type="radio"[^>]*name="severity"[^>]*value="hard"/);
    expect(html).toContain("Utrudnia działanie");
  });
});

describe("SiteHeader", () => {
  it("shows the login link and public menu to visitors", () => {
    const html = renderToStaticMarkup(<SiteHeader user={null} />);
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("/my/creator");
    expect(html).not.toContain("Wersja pokazowa");
  });

  it("links the profile page from the account menu", () => {
    const html = renderToStaticMarkup(
      <SiteHeader user={{ name: "Stanisław", role: "mieszkaniec" }} />,
    );
    expect(html).toMatch(/<a [^>]*href="\/my\/profile"[^>]*>Twój profil<\/a>/);
  });

  it("marks the current section and shows the signed-in user", () => {
    const html = renderToStaticMarkup(
      <SiteHeader user={{ name: "Stanisław", role: "jst" }} unreadNotifications={2} demoMode />,
    );
    expect(linkTag(html, "/library")).toContain('aria-current="page"');
    // Once in the wide-screen menu and once in the (hidden) mobile panel
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Powiadomienia: 2 nowe"');
    expect(html).toContain("gmina (JST)");
    expect(html).toContain("/my/middleman");
    expect(html).toContain("Wersja pokazowa");
  });

  it("keeps personal pages in the account menu and offers sign-out (#75)", () => {
    const html = renderToStaticMarkup(<SiteHeader user={{ name: "Ewa", role: "rops_admin" }} />);
    const mainMenu = html.match(/<nav aria-label="Menu główne"[^>]*>(.*?)<\/nav>/)?.[1] ?? "";
    expect(mainMenu).toContain('href="/admin"');
    expect(mainMenu).not.toContain("/my/messages");
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>.*Ewa/);
    expect(html).toContain('action="/auth/sign-out"');
    expect(html).toContain("Twój profil");
  });

  it("gives narrow screens a Menu button instead of a wrapped menu", () => {
    const html = renderToStaticMarkup(<SiteHeader user={null} />);
    expect(html).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*aria-controls="[^"]+"[^>]*>.*Menu<\/button>/,
    );
    expect(html).toContain('href="/register"');
  });
});
