// POST /api/ai/middleman – draft a service card for an innovation and an institution (#19).
// Contract: lib/contracts/middleman.ts. Signed-in users only (the card is saved as theirs).
import { aiFailure, readAiRequest } from "@/lib/ai/http";
import { createCard } from "@/lib/ai/middleman/service";
import { ServiceCardRequest } from "@/lib/contracts/middleman";
import { respond, SIGN_IN, signedInDeps } from "./deps";

export async function POST(request: Request) {
  const deps = await signedInDeps();
  if (!deps) return SIGN_IN.clone();
  const read = await readAiRequest(
    request,
    ServiceCardRequest,
    "Wybierz innowację i wpisz nazwę instytucji, a potem spróbuj ponownie.",
  );
  if ("response" in read) return read.response;
  try {
    return respond(await createCard(read.data, deps));
  } catch (e) {
    return aiFailure(e);
  }
}
