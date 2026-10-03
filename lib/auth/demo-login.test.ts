import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { demoAccount } from "./demo-accounts";
import { ensureDemoAccount, signInAsDemo } from "./demo-login";

type Client = SupabaseClient<Database>;

function serviceMock(
  opts: { existing?: { id: string; email: string }[]; linkError?: string } = {},
) {
  const upsert = vi.fn(() => Promise.resolve({ error: null }));
  const admin = {
    listUsers: vi.fn(() => Promise.resolve({ data: { users: opts.existing ?? [] }, error: null })),
    createUser: vi.fn(() => Promise.resolve({ data: { user: { id: "new-id" } }, error: null })),
    generateLink: vi.fn(() =>
      Promise.resolve(
        opts.linkError
          ? { data: null, error: { message: opts.linkError } }
          : { data: { properties: { hashed_token: "hash-123" } }, error: null },
      ),
    ),
  };
  const from = vi.fn(() => ({ upsert }));
  return { client: { auth: { admin }, from } as unknown as Client, admin, from, upsert };
}

function sessionMock(error: string | null = null) {
  const verifyOtp = vi.fn(() => Promise.resolve({ error: error ? { message: error } : null }));
  return { client: { auth: { verifyOtp } } as unknown as Client, verifyOtp };
}

describe("ensureDemoAccount", () => {
  it("creates a missing user and sets role, institution and consent", async () => {
    const s = serviceMock();

    const id = await ensureDemoAccount(s.client, demoAccount("jst"));

    expect(id).toBe("new-id");
    expect(s.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "demo.gops@example.org", email_confirm: true }),
    );
    expect(s.from).toHaveBeenCalledWith("instytucje");
    expect(s.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: demoAccount("jst").institution!.id, zweryfikowana: true }),
    );
    expect(s.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-id",
        role: "jst",
        instytucja_id: demoAccount("jst").institution!.id,
        zgoda_rodo_at: expect.any(String),
      }),
    );
  });

  it("reuses an existing user and restores the role", async () => {
    const s = serviceMock({ existing: [{ id: "old-id", email: "demo.rops@example.org" }] });

    const id = await ensureDemoAccount(s.client, demoAccount("rops"));

    expect(id).toBe("old-id");
    expect(s.admin.createUser).not.toHaveBeenCalled();
    expect(s.from).not.toHaveBeenCalledWith("instytucje");
    expect(s.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "old-id", role: "rops_admin", instytucja_id: null }),
    );
  });
});

describe("signInAsDemo", () => {
  it("redeems a server-issued magic-link token on the session client", async () => {
    const s = serviceMock();
    const session = sessionMock();

    await signInAsDemo(s.client, session.client, demoAccount("mieszkaniec"));

    expect(s.admin.generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "demo.mieszkaniec@example.org",
    });
    expect(session.verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "hash-123" });
  });

  it("fails loudly when Supabase cannot issue or redeem the token", async () => {
    await expect(
      signInAsDemo(
        serviceMock({ linkError: "nope" }).client,
        sessionMock().client,
        demoAccount("ngo"),
      ),
    ).rejects.toThrow(/issue demo token/);
    await expect(
      signInAsDemo(serviceMock().client, sessionMock("expired").client, demoAccount("ngo")),
    ).rejects.toThrow(/start demo session/);
  });
});
