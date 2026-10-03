import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { DemoAccountList } from "@/components/auth/demo-account-list";
import { LoginForm } from "@/components/auth/login-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser, headerName } from "@/lib/auth";
import { isDemoMode } from "@/lib/auth/demo-accounts";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata = { title: "Logowanie – HubMI.pl" };

// Layout per design/makiety/Logowanie.dc.html: one centered card, e-mail and password.
// In demo mode (DEMO_MODE=true) the fictional "Wejdź jako…" accounts are shown next to it.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const linkError = params.error === "link";
  const demoError = params.error === "demo";
  const user = await getCurrentUser();
  const demo = isDemoMode() ? <DemoAccountList /> : undefined;

  if (user) {
    return (
      <AuthCard title="Jesteś zalogowany" headingId="login-heading" aside={demo}>
        <p className="text-muted-foreground">
          Konto: <strong className="text-ink">{headerName(user)}</strong>
          {user.email ? ` (${user.email})` : null}
        </p>
        <SignOutButton />
      </AuthCard>
    );
  }

  const registerHref = next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`;
  return (
    <AuthCard
      title="Zaloguj się"
      headingId="login-heading"
      aside={demo}
      footer={
        <>
          Nie masz konta?{" "}
          <Link href={registerHref} className="font-bold">
            Załóż konto
          </Link>
        </>
      }
    >
      {demoError ? (
        <p role="alert" className="text-danger font-bold">
          Nie udało się wejść na konto pokazowe. Spróbuj ponownie.
        </p>
      ) : null}
      {linkError ? (
        <p role="alert" className="text-danger font-bold">
          Link z maila wygasł albo został już użyty. Poproś o nowy.
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthCard>
  );
}
