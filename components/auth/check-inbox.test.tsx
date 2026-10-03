import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({ resendSignupEmail: vi.fn() }));

const { CheckInbox } = await import("./check-inbox");

describe("CheckInbox", () => {
  const html = renderToStaticMarkup(<CheckInbox email="anna@example.org" next="/match" />);

  it("tells the user that an e-mail was sent and to which address", () => {
    expect(html).toContain("Sprawdź skrzynkę");
    expect(html).toContain("<strong");
    expect(html).toContain("anna@example.org");
    expect(html).toContain("Potwierdzam adres");
    expect(html).toMatch(/Spam/);
  });

  it("announces the message and offers a resend and a way back", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain("Wyślij link ponownie");
    expect(html).toMatch(/<input[^>]*name="email"[^>]*value="anna@example.org"/);
    expect(html).toMatch(/<a[^>]*href="\/login"/);
  });
});
