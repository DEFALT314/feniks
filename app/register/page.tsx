import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata = { title: "Załóż konto – HubMI.pl" };

// Layout per design/makiety/Rejestracja.dc.html
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  if (await getCurrentUser()) redirect(next);

  const loginHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
  return (
    <AuthCard
      title="Załóż konto"
      headingId="register-heading"
      footer={
        <>
          Masz już konto?{" "}
          <Link href={loginHref} className="font-bold">
            Zaloguj się
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
