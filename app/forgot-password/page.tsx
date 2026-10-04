import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Nie pamiętasz hasła – HubMI.pl" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Nie pamiętasz hasła?"
      headingId="forgot-heading"
      footer={
        <Link href="/login" className="inline-flex min-h-11 items-center font-bold">
          Wróć do logowania
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
