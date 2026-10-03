import { describe, expect, it, vi } from "vitest";
import { isDeliverable, renderEmail, sendEmail, siteUrl } from "./email";

vi.mock("server-only", () => ({}));

const message = {
  to: "anna@gmail.com",
  subject: "Ocena pomysłu",
  heading: "ROPS ocenił Twój pomysł",
  paragraphs: ["Status: do poprawy.", "Komentarz: <dopisz koszty>"],
  action: { label: "Zobacz pomysł", url: "https://feniks-hub.vercel.app/my/creator" },
};

const okFetch = () =>
  vi.fn(async () => new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));

describe("sendEmail", () => {
  it("posts to Resend with the key, sender, subject and both bodies", async () => {
    const fetchImpl = okFetch();

    const result = await sendEmail(message, { RESEND_API_KEY: "re_test" }, fetchImpl);

    expect(result).toEqual({ sent: true, id: "email-1" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ to: ["anna@gmail.com"], subject: "Ocena pomysłu" });
    expect(body.from).toContain("HubMI.pl");
    expect(body.text).toContain("Zobacz pomysł: https://feniks-hub.vercel.app/my/creator");
  });

  it("uses EMAIL_FROM when a domain is verified", async () => {
    const fetchImpl = okFetch();
    await sendEmail(message, { RESEND_API_KEY: "k", EMAIL_FROM: "HubMI <a@hubmi.pl>" }, fetchImpl);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).from).toBe("HubMI <a@hubmi.pl>");
  });

  it("skips sending without a key or to demo addresses", async () => {
    const fetchImpl = okFetch();
    expect(await sendEmail(message, {}, fetchImpl)).toEqual({
      sent: false,
      reason: "not-configured",
    });
    expect(
      await sendEmail(
        { ...message, to: "demo.rops@example.org" },
        { RESEND_API_KEY: "k" },
        fetchImpl,
      ),
    ).toEqual({ sent: false, reason: "undeliverable-address" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never throws on API or network errors", async () => {
    const failing = vi.fn(
      async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }),
    );
    expect(await sendEmail(message, { RESEND_API_KEY: "k" }, failing)).toEqual({
      sent: false,
      reason: "domain not verified",
    });
    const offline = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await sendEmail(message, { RESEND_API_KEY: "k" }, offline)).toEqual({
      sent: false,
      reason: "offline",
    });
  });
});

describe("renderEmail", () => {
  it("escapes user text in HTML", () => {
    const { html } = renderEmail(message);
    expect(html).toContain("&lt;dopisz koszty&gt;");
    expect(html).not.toContain("<dopisz koszty>");
  });
});

describe("isDeliverable / siteUrl", () => {
  it("rejects malformed and example addresses", () => {
    expect(isDeliverable("anna@gmail.com")).toBe(true);
    expect(isDeliverable("anna")).toBe(false);
    expect(isDeliverable("x@example.com")).toBe(false);
  });

  it("prefers SITE_URL, then the Vercel production URL", () => {
    expect(siteUrl({ SITE_URL: "https://hubmi.pl/" })).toBe("https://hubmi.pl");
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "feniks-hub.vercel.app" })).toBe(
      "https://feniks-hub.vercel.app",
    );
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});
