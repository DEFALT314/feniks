import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadCurrentUser } from "./current-user";

export type { CurrentUser } from "./current-user";
export { headerName } from "./current-user";
export { adminAccess, hasRole, isRopsRole, ROPS_ROLES } from "./roles";

/** Signed-in user with role, or null. Cached per request, so layouts and pages can all call it. */
export const getCurrentUser = cache(async () => loadCurrentUser(await createClient()));
