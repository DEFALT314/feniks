import { z } from "zod";

// Messages are shown to the user, so they stay in Polish.
export const LoginEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Wpisz poprawny adres e-mail, np. jan@example.org" }));

export const LoginCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "Kod ma 6 cyfr. Przepisz go z maila." });

export const SendCodeInput = z.object({
  email: LoginEmail,
  consent: z.literal(true, { message: "Zaznacz zgodę, żeby się zalogować." }),
  next: z.string().optional(),
});
export type SendCodeInput = z.infer<typeof SendCodeInput>;

export const VerifyCodeInput = z.object({
  email: LoginEmail,
  code: LoginCode,
  next: z.string().optional(),
});
export type VerifyCodeInput = z.infer<typeof VerifyCodeInput>;

/**
 * Where to send the user after signing in. Only paths inside the app are allowed,
 * so a crafted ?next=https://evil.example link cannot redirect people away.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
