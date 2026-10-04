import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "@/lib/messaging";
import { MessageList } from "./message-list";

const msg = (id: string, mine: boolean, tresc: string, minute: number): ThreadMessage => ({
  id,
  autor_id: mine ? "me" : "rops-1",
  autor_nazwa: mine ? "Anna" : "Redakcja ROPS",
  autor_rola: mine ? "mieszkaniec" : "rops_redaktor",
  tresc,
  created_at: `2026-10-03T20:${String(minute).padStart(2, "0")}:00Z`,
  mine,
});

const items = (html: string) => html.match(/<li[^>]*>/g) ?? [];

describe("MessageList", () => {
  it("puts my messages on the right and the other side on the left", () => {
    const html = renderToStaticMarkup(
      <MessageList messages={[msg("1", true, "Dzień dobry", 15), msg("2", false, "Witamy", 16)]} />,
    );
    const [mine, theirs] = items(html);
    expect(mine).toContain("items-end");
    expect(theirs).toContain("items-start");
    expect(html).toContain("bg-navy text-white");
  });

  it("shows the other side's name once per run and keeps it for screen readers", () => {
    const html = renderToStaticMarkup(
      <MessageList
        messages={[msg("1", false, "A", 15), msg("2", false, "B", 15), msg("3", true, "C", 16)]}
      />,
    );
    expect(html.match(/Redakcja ROPS/g)).toHaveLength(2);
    expect(html.match(/sr-only">Redakcja ROPS/g)).toHaveLength(1);
    expect(html).toContain('sr-only">Ty</span>');
  });

  it("is a named log that does not read the whole history again", () => {
    const html = renderToStaticMarkup(<MessageList messages={[msg("1", true, "A", 15)]} />);
    expect(html).toMatch(/<ol[^>]*role="log"/);
    expect(html).toContain('aria-label="Historia rozmowy"');
    expect(html).toContain('aria-live="off"');
  });

  it("shows the day with the time and keeps the machine-readable date", () => {
    const html = renderToStaticMarkup(
      <MessageList messages={[msg("1", false, "A", 15)]} now={new Date("2026-10-05T09:00:00Z")} />,
    );
    expect(html).toContain('dateTime="2026-10-03T20:15:00Z"');
    expect(html).toContain("3 października, 22:15");
  });
});
