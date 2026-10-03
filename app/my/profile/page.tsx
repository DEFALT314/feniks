import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { roleLabel } from "@/components/ui/navigation";
import { getCurrentUser, headerName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DisplayNameForm } from "./_components/display-name-form";
import { RoleRequestForm } from "./_components/role-request-form";
import { RequestableRole } from "./_lib/role-request";

export const metadata = { title: "Twój profil – HubMI.pl" };

// Layout per design/makiety/Profil.dc.html: account, role request (#6), password and sign-out.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my/profile");

  const role = roleLabel(user.role);
  const isRops = user.role === "rops_redaktor" || user.role === "rops_admin";
  const { data: profile } = await (
    await createClient()
  )
    .from("profiles")
    .select("wnioskowana_rola")
    .eq("id", user.id)
    .maybeSingle();
  const pendingRole = RequestableRole.safeParse(profile?.wnioskowana_rola).data ?? null;

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 pt-10 pb-[72px] sm:px-10"
    >
      <h1 className="font-heading text-[2.5rem] font-bold tracking-tight">Twój profil</h1>

      <Card
        role="region"
        aria-labelledby="account-heading"
        className="flex flex-col gap-4 p-7 sm:px-8"
      >
        <h2 id="account-heading" className="font-heading text-2xl font-bold">
          Konto
        </h2>
        <DisplayNameForm name={user.displayName ?? headerName(user)} />
        <dl className="m-0 flex flex-col">
          <div className="border-border flex flex-wrap justify-between gap-4 border-t py-3.5">
            <dt className="text-muted-foreground">Adres e-mail</dt>
            <dd className="m-0 font-bold">{user.email}</dd>
          </div>
          <div className="border-border flex flex-wrap justify-between gap-4 border-t py-3.5">
            <dt className="text-muted-foreground">Rola</dt>
            <dd className="m-0">
              <Badge>{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {isRops ? null : (
        <Card
          role="region"
          aria-labelledby="role-heading"
          className="flex flex-col gap-3.5 p-7 sm:px-8"
        >
          <h2 id="role-heading" className="font-heading text-2xl font-bold">
            Działasz w imieniu instytucji?
          </h2>
          <p className="text-muted-foreground m-0">
            Organizacje, gminy i eksperci mają dodatkowe narzędzia, np. kartę usługi dla gminy. Rolę
            zatwierdza ROPS.
          </p>
          <RoleRequestForm pending={pendingRole} />
        </Card>
      )}

      <Card
        role="region"
        aria-labelledby="security-heading"
        className="flex flex-col gap-3.5 p-7 sm:px-8"
      >
        <h2 id="security-heading" className="font-heading text-2xl font-bold">
          Bezpieczeństwo
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/update-password" className={buttonVariants({ variant: "secondary" })}>
            Zmień hasło
          </Link>
          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}
