import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Shown instead of the creator when nobody is signed in: ideas are saved on the author's account
export function SignInPrompt({ next }: { next: string }) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[820px] flex-1 flex-col items-start gap-4 px-4 py-16 sm:px-10"
    >
      <h1 className="text-[2.5rem] leading-tight font-bold">Kreator pomysłów</h1>
      <p>
        Kreator prowadzi przez kanwę innowacji: jedno pytanie na ekranie. Na końcu powstaje fiszka,
        którą możesz wysłać do ROPS. Zaloguj się, żeby zapisywać pomysły na swoim koncie.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonVariants()}>
          Zaloguj się
        </Link>
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Załóż konto
        </Link>
      </div>
    </main>
  );
}

export function IdeaNotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start gap-4 px-4 py-12 sm:px-10"
    >
      <h1 className="text-3xl font-bold">Nie ma takiego pomysłu</h1>
      <p>Ten pomysł nie istnieje albo należy do innego konta.</p>
      <Link href="/my/creator" className={buttonVariants({ variant: "secondary" })}>
        Wróć do moich pomysłów
      </Link>
    </main>
  );
}

// Shown on the canvas and the card while ROPS has the idea (database lock in *_creator_submit.sql)
export function LockedNotice() {
  return (
    <p className="bg-warning-soft text-ink rounded-[10px] px-4 py-3 text-base">
      <strong>Pomysł jest w ROPS.</strong> Możesz go czytać, ale nie zmieniać. Edycja wróci, jeśli
      ROPS poprosi o poprawki.
    </p>
  );
}
