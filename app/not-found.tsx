import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nie znaleźliśmy tej strony – HubMI.pl",
};

// Replaces the default Next.js 404 (English text, no <main>, so the skip link led nowhere)
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-5 px-4 py-12 sm:px-10"
    >
      <h1 className="text-4xl font-bold">Nie znaleźliśmy tej strony</h1>
      <p>
        Adres może być błędny albo strona została usunięta. Sprawdź adres albo zacznij od strony
        głównej.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          Strona główna
        </Link>
        <Link href="/library" className={buttonVariants({ variant: "secondary" })}>
          Biblioteka innowacji
        </Link>
      </div>
    </main>
  );
}
