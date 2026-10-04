// After setting a new password the user lands on their profile with a confirmation, not on the
// home page without a word: a senior would not know whether it worked.
export const PASSWORD_CHANGED_PATH = "/my/profile?password=changed";

/** True when the profile page was opened right after a successful password change. */
export function isPasswordChanged(params: Record<string, string | string[] | undefined>): boolean {
  return params.password === "changed";
}
