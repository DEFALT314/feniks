import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { recordConsent } from "@/lib/auth/login";
import { safeNextPath } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

// Sign-in link from the e-mail. Supabase sends either ?code= (PKCE) or ?token_hash=&type=.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
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
  await recordConsent(supabase, data.user.id);
  return NextResponse.redirect(new URL(next, origin));
}
