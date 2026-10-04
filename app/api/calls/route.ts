// GET /api/calls – open data: published calls for proposals ("nabory", P4). Contract: CallsQuery /
// CallsResponse in lib/contracts/admin.ts. Public (no sign-in), CORS-enabled and cached briefly, so
// municipal websites and grant databases can read it. ?area=<challenge area id> &status=open|all
// &format=json|csv
import { NextResponse } from "next/server";
import { callsToCsv, listPublishedCalls } from "@/lib/calls";
import { CallsQuery } from "@/lib/contracts/admin";
import { createClient } from "@/lib/supabase/server";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = CallsQuery.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe parametry. Dozwolone: area, status=open|all, format=json|csv." },
      { status: 400, headers: HEADERS },
    );
  }
  const { area, status, format } = parsed.data;
  try {
    const calls = await listPublishedCalls(await createClient(), { area, status });
    if (format === "csv") {
      return new NextResponse(callsToCsv(calls), {
        headers: {
          ...HEADERS,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="nabory-hubmi.csv"',
        },
      });
    }
    return NextResponse.json(
      {
        calls,
        count: calls.length,
        generated_at: new Date().toISOString(),
        source: "HubMI.pl – Regionalny Ośrodek Polityki Społecznej w Krakowie",
      },
      { headers: HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Nie udało się wczytać naborów." },
      { status: 500, headers: HEADERS },
    );
  }
}
