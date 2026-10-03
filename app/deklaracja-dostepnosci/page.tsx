import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deklaracja dostępności – HubMI.pl",
};

export default function AccessibilityStatementPage() {
  return (
    <main id="tresc" className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12 sm:px-10">
      <h1 className="text-4xl font-bold">Deklaracja dostępności</h1>
      <p>
        HubMI to prototyp przygotowany na HackYeah 2026 dla Regionalnego Ośrodka Polityki Społecznej
        w Krakowie. Projektujemy go zgodnie z WCAG 2.1 na poziomie AA.
      </p>
      <h2 className="text-2xl font-bold">Co już działa</h2>
      <ul className="list-disc pl-6">
        <li>Całą stronę obsłużysz klawiaturą, a zaznaczony element ma wyraźną obwódkę.</li>
        <li>Link „Przejdź do treści” na początku strony pomija menu.</li>
        <li>Przycisk A+ w nagłówku powiększa tekst i podnosi kontrast.</li>
        <li>Tekst ma kontrast co najmniej 4,5:1, a strona działa przy powiększeniu 200%.</li>
        <li>Odpowiedzi AI i powiadomienia są odczytywane przez czytniki ekranu.</li>
      </ul>
      <h2 className="text-2xl font-bold">Zgłoś problem</h2>
      <p>
        Jeśli coś nie działa, napisz do zespołu ROPS przez moduł Wiadomości. Odpowiemy najszybciej,
        jak to możliwe.
      </p>
    </main>
  );
}
