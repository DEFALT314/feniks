import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Nowe hasło – HubMI.pl" };

// Reached from the password-reset link (/auth/confirm signs the user in first).
export default async function UpdatePasswordPage() {
  if (!(await getCurrentUser())) redirect("/login?error=link");
  return (
    <AuthCard title="Ustaw nowe hasło" headingId="update-password-heading">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
