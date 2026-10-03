// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ removeChannel: vi.fn() }) }));
vi.mock("@/lib/supabase/realtime", () => ({ authorizeRealtime: () => new Promise(() => {}) }));
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

const { NotificationBell } = await import("./notification-bell");

const item = {
  id: "n1",
  user_id: "u1",
  typ: "pomysl_oceniony",
  tytul: "ROPS ocenił pomysł",
  link: "/my/creator",
  przeczytane: false,
  created_at: "2026-10-03T18:00:00+02:00",
};

let container: HTMLDivElement;
let root: Root;
const heard = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.addEventListener(ANNOUNCE_EVENT, (e) => heard((e as CustomEvent<string>).detail));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ powiadomienia: [item], nieprzeczytane: 1 }),
    })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  heard.mockReset();
  vi.unstubAllGlobals();
});

describe("NotificationBell", () => {
  it("announces the loaded list, and keeps focus in the panel after 'mark all'", async () => {
    act(() => root.render(<NotificationBell userId="u1" initialUnread={1} />));
    await act(async () => container.querySelector("button")!.click());
    expect(heard).toHaveBeenCalledWith("1 powiadomienie, w tym 1 nowe.");

    const markAll = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.startsWith("Oznacz wszystkie"),
    )!;
    markAll.focus();
    await act(async () => markAll.click());

    expect(container.textContent).not.toContain("Oznacz wszystkie");
    expect(document.activeElement).toBe(container.querySelector("h2"));
    expect(heard).toHaveBeenCalledWith("Wszystkie powiadomienia oznaczone jako przeczytane.");
  });

  it("asks for new notifications on its own when Realtime does not connect", async () => {
    vi.useFakeTimers();
    try {
      act(() => root.render(<NotificationBell userId="u1" initialUnread={0} />));
      expect(fetch).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(fetch).toHaveBeenCalledWith("/api/notifications", { cache: "no-store" });
      expect(container.querySelector("button")!.getAttribute("aria-label")).toBe(
        "Powiadomienia: 1 nowe",
      );
      expect(heard).toHaveBeenCalledWith("Nowe powiadomienie: ROPS ocenił pomysł");
    } finally {
      vi.useRealTimers();
    }
  });
});
