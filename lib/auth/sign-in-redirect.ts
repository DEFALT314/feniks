import { safeNextPath } from "./validation";

/** /login URL that brings the user back to `path` after signing in. */
export function signInUrl(path: string | null | undefined): string {
  const next = safeNextPath(path, "/");
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
