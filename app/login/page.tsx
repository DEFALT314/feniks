import { DemoAccountList } from "@/components/auth/demo-account-list";
import { LoginForm } from "@/components/auth/login-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, headerName } from "@/lib/auth";
import { isDemoMode } from "@/lib/auth/demo-accounts";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata = { title: "Logowanie – HubMI.pl" };

// Layout per design/makiety/Logowanie.dc.html. Sign-in logic: P4 (lib/auth); styling: P2.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const linkError = params.error === "link";
  const demoError = params.error === "demo";
  const user = await getCurrentUser();

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start gap-8 px-4 pt-14 pb-[72px] sm:px-10"
    >
      <Card
        role="region"
        aria-labelledby="login-heading"
        className="flex flex-[1_1_460px] flex-col gap-[18px] p-9"
      >
        {user ? (
          <>
            <h1 id="login-heading" className="font-heading text-4xl font-bold tracking-tight">
              Jesteś zalogowany
            </h1>
            <p className="text-muted-foreground">
              Konto: <strong className="text-ink">{headerName(user)}</strong>
              {user.email ? ` (${user.email})` : null}
            </p>
            <SignOutButton />
          </>
        ) : (
          <>
            <h1 id="login-heading" className="font-heading text-4xl font-bold tracking-tight">
              Zaloguj się kodem z maila
            </h1>
            <p className="text-muted-foreground">
              Bez hasła. Wyślemy 6-cyfrowy kod, ważny przez 10 minut.
            </p>
            {demoError ? (
              <p role="alert" className="text-danger font-bold">
                Nie udało się wejść na konto pokazowe. Spróbuj ponownie.
              </p>
            ) : null}
            {linkError ? (
              <p role="alert" className="text-danger font-bold">
                Link z maila wygasł albo został już użyty. Wyślij nowy kod.
              </p>
            ) : null}
            <LoginForm next={next} />
            <div className="border-border flex flex-col gap-2.5 border-t pt-[18px]">
              <span className="text-muted-foreground text-[0.9375rem] font-bold">
                Wkrótce, w pilotażu
              </span>
              <Button variant="secondary" disabled className="justify-start">
                Profil zaufany lub mObywatel (login.gov.pl)
              </Button>
              <Button variant="secondary" disabled className="justify-start">
                Konto służbowe ROPS
              </Button>
            </div>
          </>
        )}
      </Card>
      {isDemoMode() ? <DemoAccountList /> : null}
    </main>
  );
}
