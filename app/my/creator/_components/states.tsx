import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

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
      <strong>Pomysł jest już w ROPS.</strong> Możesz go czytać, ale nie zmieniać. Jeśli ROPS
      poprosi o poprawki, znów będzie można go zmieniać.
    </p>
  );
}
