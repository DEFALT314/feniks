import { z } from "zod";

// Messages are shown to the user, so they stay in Polish.
export const LoginEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Wpisz poprawny adres e-mail, np. jan@example.org" }));

export const PASSWORD_MIN_LENGTH = 10;

/** A new password (sign-up, password change). Supabase/bcrypt reads at most 72 bytes. */
export const NewPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
  })
  .max(72, { message: "Hasło może mieć najwyżej 72 znaki." });

export const SignInInput = z.object({
  email: LoginEmail,
  password: z.string().min(1, { message: "Wpisz hasło." }),
  next: z.string().optional(),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const SignUpInput = z.object({
  email: LoginEmail,
  password: NewPassword,
  consent: z.literal(true, { message: "Zaznacz zgodę, żeby założyć konto." }),
  next: z.string().optional(),
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const PasswordResetInput = z.object({ email: LoginEmail });

export const UpdatePasswordInput = z.object({ password: NewPassword });

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
