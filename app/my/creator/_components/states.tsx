import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Drafts are read from the browser, so the first render has nothing to show yet
export function Loading() {
  return (
    <main id="main-content" className="flex-1" aria-busy="true">
      <p className="mx-auto max-w-[1200px] px-4 py-12 sm:px-10">Wczytywanie…</p>
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
      <p>
        Szkice pomysłów zapisują się w tej przeglądarce. Może pomysł powstał na innym urządzeniu?
      </p>
      <Link href="/my/creator" className={buttonVariants({ variant: "secondary" })}>
        Wróć do moich pomysłów
      </Link>
    </main>
  );
}
