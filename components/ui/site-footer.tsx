import Link from "next/link";

// Footer per design/makiety/Stopka.dc.html: who made it, how AI is used, accessibility statement
export function SiteFooter() {
  return (
    <footer className="border-border bg-neutral-soft border-t text-base">
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-16 gap-y-8 px-4 py-10 sm:px-10">
        <div className="flex flex-[2_1_360px] flex-col gap-2">
          <p className="font-heading text-xl font-bold">HubMI</p>
          <p className="text-muted-foreground">
            Małopolski Hub Innowacji Społecznych. Prototyp z HackYeah 2026 przygotowany dla
            Regionalnego Ośrodka Polityki Społecznej w Krakowie. Osoby i dane użytkowników są
            fikcyjne.
          </p>
          <p className="text-muted-foreground">
            Treści oznaczone „Propozycja AI” przygotował model językowy. Wybiera tylko spośród
            innowacji z Biblioteki ROPS, a decyzję podejmuje człowiek.
          </p>
        </div>
        <nav aria-label="Stopka" className="flex flex-[1_1_220px] flex-col gap-1.5">
          <Link href="/accessibility">Deklaracja dostępności</Link>
          <Link href="/library">Biblioteka innowacji ROPS</Link>
          <Link href="/resources">Raporty i publikacje</Link>
        </nav>
      </div>
    </footer>
  );
}
