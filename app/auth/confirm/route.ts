import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { recordConsent } from "@/lib/auth/login";
import { requestOrigin, safeNextPath } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

// Link from an e-mail (sign-up confirmation, password reset). Supabase sends ?code= (PKCE) or
// ?token_hash=&type= (our e-mail templates use token_hash, so the link works on any device).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Not request.nextUrl.origin: it can differ from the host the browser used (e.g. 127.0.0.1 vs localhost),
  // and the session cookie set here only exists on that host.
  const origin = requestOrigin(request.headers);
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { user: null }, error: new Error("missing token") };

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }
  // Sign-up required the consent checkbox; store its time once the address is confirmed.
  await recordConsent(supabase, data.user.id);
  return NextResponse.redirect(new URL(next, origin));
}
