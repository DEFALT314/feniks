import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DemoAccount } from "./demo-accounts";

type Client = SupabaseClient<Database>;

async function findUserByEmail(service: Client, email: string): Promise<User | null> {
  // Few users in a demo project; one page of 1000 is enough.
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  return data.users.find((u) => u.email === email) ?? null;
}

/**
 * Makes sure the demo account exists with the right role and institution. Self-healing: if someone
 * changed or deleted the account during the demo, the next "Wejdź jako…" restores it.
 * Uses the service key, so it may only be called from app/api/demo/.
 */
export async function ensureDemoAccount(service: Client, account: DemoAccount): Promise<string> {
  let user = await findUserByEmail(service, account.email);
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email: account.email,
      email_confirm: true,
      user_metadata: { nazwa_wyswietlana: account.displayName, demo: true },
    });
    if (error || !data.user) throw new Error(`Failed to create demo user: ${error?.message}`);
    user = data.user;
  }

  if (account.institution) {
    const { error } = await service
      .from("instytucje")
      .upsert({ ...account.institution, zweryfikowana: true });
    if (error) throw new Error(`Failed to save demo institution: ${error.message}`);
  }

  const { error } = await service.from("profiles").upsert({
    id: user.id,
    role: account.role,
    nazwa_wyswietlana: account.displayName,
    instytucja_id: account.institution?.id ?? null,
    zgoda_rodo_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save demo profile: ${error.message}`);

  return user.id;
}

/**
 * Signs the browser in as the demo account with a real Supabase session: the service client issues
 * a one-time magic-link token and the session client (with cookies) redeems it. No e-mail is sent.
 */
export async function signInAsDemo(service: Client, session: Client, account: DemoAccount) {
  await ensureDemoAccount(service, account);

  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: account.email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw new Error(`Failed to issue demo token: ${error?.message}`);

  const { error: verifyError } = await session.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) throw new Error(`Failed to start demo session: ${verifyError.message}`);
}
