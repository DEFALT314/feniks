// POST /api/demo/login {konto} – "Wejdź jako…" (#3). Owner: P4.
// Only with DEMO_MODE=true; otherwise the endpoint does not exist (404).
// Accepts JSON ({ konto }) → { ok, next }, or a plain HTML form (konto=…) → 303 redirect.
import { NextResponse } from "next/server";
import { DemoAccountKey, demoAccount, isDemoMode } from "@/lib/auth/demo-accounts";
import { signInAsDemo } from "@/lib/auth/demo-login";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function readAccountKey(request: Request): Promise<{ key: unknown; isForm: boolean }> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { konto?: unknown } | null;
    return { key: body?.konto, isForm: false };
  }
  const form = await request.formData().catch(() => null);
  return { key: form?.get("konto"), isForm: true };
}

export async function POST(request: Request) {
  if (!isDemoMode()) return new NextResponse(null, { status: 404 });

  const { key, isForm } = await readAccountKey(request);
  const parsed = DemoAccountKey.safeParse(key);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieznane konto pokazowe." }, { status: 400 });
  }

  const account = demoAccount(parsed.data);
  try {
    await signInAsDemo(createServiceClient(), await createClient(), account);
  } catch (error) {
    console.error("demo login failed", error);
    if (isForm) return NextResponse.redirect(new URL("/login?error=demo", request.url), 303);
    return NextResponse.json({ error: "Nie udało się wejść na konto pokazowe." }, { status: 500 });
  }

  if (isForm) return NextResponse.redirect(new URL(account.startPath, request.url), 303);
  return NextResponse.json({ ok: true, next: account.startPath });
}
