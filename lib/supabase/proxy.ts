import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Path of the current request, for server layouts that need it (e.g. /login?next=<path> in
// app/my/layout.tsx). Layouts do not receive the pathname, so the proxy forwards it as a header.
export const PATHNAME_HEADER = "x-hubmi-pathname";

// Forwards the request with its (possibly refreshed) cookies plus the pathname header.
function forward(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

// Refreshes the Supabase session and rewrites cookies. This is NOT a security check:
// permissions are checked by getCurrentUser() and layouts on the server.
export async function updateSession(request: NextRequest) {
  let response = forward(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = forward(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not put code between createServerClient and getUser().
  await supabase.auth.getUser();

  return response;
}
