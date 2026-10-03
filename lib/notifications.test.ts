import { describe, expect, it, vi } from "vitest";
import { addNotification, notifyIdeaSent } from "./notifications";
import { mockRpcClient } from "./test/supabase-mock";

vi.mock("server-only", () => ({}));

const ANNA = "11111111-1111-4111-8111-111111111111";

describe("addNotification", () => {
  it("notifies ROPS roles through the dodaj_powiadomienie rpc", async () => {
    const { client, rpc } = mockRpcClient({ data: 2 });

    const count = await addNotification(
      {
        role: ["rops_redaktor", "rops_admin"],
        typ: "pomysl_wyslany",
        tytul: "Nowy pomysł",
        link: "/admin",
      },
      client,
    );

    expect(count).toBe(2);
    expect(rpc).toHaveBeenCalledWith("dodaj_powiadomienie", {
      p_typ: "pomysl_wyslany",
      p_tytul: "Nowy pomysł",
      p_link: "/admin",
      p_user_ids: undefined,
      p_role: ["rops_redaktor", "rops_admin"],
    });
  });

  it("passes explicit recipients and omits a missing link (database default null)", async () => {
    const { client, rpc } = mockRpcClient({ data: 1 });

    await addNotification({ userIds: [ANNA], typ: "pomysl_oceniony", tytul: "Ocena" }, client);

    expect(rpc).toHaveBeenCalledWith(
      "dodaj_powiadomienie",
      expect.objectContaining({ p_user_ids: [ANNA], p_role: undefined, p_link: undefined }),
    );
  });

  it("rejects a notification without recipients before calling the database", async () => {
    const { client, rpc } = mockRpcClient({ data: 0 });

    await expect(addNotification({ typ: "x", tytul: "y" }, client)).rejects.toThrow(/Recipients/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unknown role and an external link", async () => {
    const { client } = mockRpcClient({ data: 0 });

    await expect(
      // @ts-expect-error intentionally invalid role
      addNotification({ role: ["admin"], typ: "x", tytul: "y" }, client),
    ).rejects.toThrow();
    await expect(
      addNotification(
        { userIds: [ANNA], typ: "x", tytul: "y", link: "https://bad.example" },
        client,
      ),
    ).rejects.toThrow();
  });

  it("turns a database error into a readable exception", async () => {
    const { client } = mockRpcClient({ error: { message: "Wymagane logowanie" } });

    await expect(
      addNotification({ userIds: [ANNA], typ: "x", tytul: "y" }, client),
    ).rejects.toThrow("Failed to add notification: Wymagane logowanie");
  });
});

describe("notifyIdeaSent", () => {
  it("notifies ROPS in the app and e-mails the ROPS inbox with a panel link", async () => {
    const { client, rpc } = mockRpcClient({ data: 2 });
    const sendEmail = vi.fn(async () => ({ sent: true as const, id: "m1" }));

    const result = await notifyIdeaSent(
      { ideaId: "i1", tytul: "Kawiarenka", autorNazwa: "Stanisław" },
      client,
      { sendEmail, env: { ROPS_NOTIFY_EMAIL: "rops@example.pl", SITE_URL: "https://hubmi.pl" } },
    );

    expect(result).toEqual({ notified: 2, emailSent: true });
    expect(rpc).toHaveBeenCalledWith(
      "dodaj_powiadomienie",
      expect.objectContaining({
        p_role: ["rops_redaktor", "rops_admin"],
        p_typ: "pomysl_wyslany",
        p_link: "/admin?idea=i1",
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "rops@example.pl",
        subject: "Nowy pomysł do oceny: Kawiarenka",
        action: { label: "Otwórz w Panelu ROPS", url: "https://hubmi.pl/admin?idea=i1" },
      }),
      expect.anything(),
    );
  });

  it("falls back to the SMTP inbox and skips the e-mail when nothing is configured", async () => {
    const sendEmail = vi.fn(async () => ({ sent: true as const, id: "m1" }));
    await notifyIdeaSent({ ideaId: "i1", tytul: "A" }, mockRpcClient({ data: 1 }).client, {
      sendEmail,
      env: { SMTP_USER: "hubmi@gmail.com" },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "hubmi@gmail.com" }),
      expect.anything(),
    );

    const none = vi.fn();
    const r = await notifyIdeaSent(
      { ideaId: "i1", tytul: "A" },
      mockRpcClient({ data: 1 }).client,
      {
        sendEmail: none,
        env: {},
      },
    );
    expect(r.emailSent).toBe(false);
    expect(none).not.toHaveBeenCalled();
  });
});
