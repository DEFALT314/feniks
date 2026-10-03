import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deklaracja dostępności – HubMI.pl",
};

// Accessibility statement. Keep it true: it was rewritten after the WCAG audit of October 2026,
// when the old version promised things that did not work yet.
export default function AccessibilityStatementPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12 sm:px-10"
    >
      <h1 className="text-4xl font-bold">Deklaracja dostępności</h1>
      <p>
        HubMI to prototyp przygotowany na HackYeah 2026 dla Regionalnego Ośrodka Polityki Społecznej
        w Krakowie. Projektujemy go zgodnie z WCAG 2.1 na poziomie AA. Serwis jest częściowo zgodny
        z tym standardem. Poniżej piszemy, co działa, a czego jeszcze nie sprawdziliśmy.
      </p>
      <p>Ostatni przegląd dostępności: 4 października 2026.</p>

      <h2 className="text-2xl font-bold">Co działa</h2>
      <ul className="list-disc pl-6">
        <li>Stronę obsłużysz klawiaturą, a zaznaczony element ma wyraźną granatową obwódkę.</li>
        <li>Link „Przejdź do treści” na początku strony pomija menu.</li>
        <li>
          Przycisk A+ w nagłówku powiększa tekst, przyciemnia kolory i pogrubia ramki. Strona
          zapamięta ten wybór. Wyższy kontrast włącza się też sam, jeśli masz go włączony w
          ustawieniach telefonu lub komputera.
        </li>
        <li>Tekst ma kontrast co najmniej 4,5:1, a strona działa przy powiększeniu 200% i 400%.</li>
        <li>
          Po wysłaniu formularza z błędem kursor przechodzi do pierwszego pola do poprawy, a czytnik
          ekranu odczytuje opis błędu.
        </li>
        <li>Czytnik ekranu krótko odczyta wyniki AI i nowe wiadomości.</li>
        <li>Animacje wyłączają się, jeśli w systemie wybierzesz ograniczenie ruchu.</li>
      </ul>

      <h2 className="text-2xl font-bold">Czego jeszcze nie sprawdziliśmy</h2>
      <ul className="list-disc pl-6">
        <li>Testów z osobami korzystającymi z czytników ekranu na co dzień.</li>
        <li>Napisów do wszystkich filmów w Bibliotece.</li>
      </ul>

      <h2 className="text-2xl font-bold">Zgłoś problem</h2>
      <p>
        Jeśli coś nie działa albo potrzebujesz treści w innej formie, napisz e-mail na adres{" "}
        <a href="mailto:dostepnosc@hubmi.pl">dostepnosc@hubmi.pl</a>. Nie musisz mieć konta. Napisz,
        na której stronie jest problem i jak się z Tobą skontaktować. Odpowiemy w ciągu 7 dni.
      </p>
      <p>Jeśli masz konto, możesz też napisać do ROPS w zakładce Wiadomości.</p>
    </main>
  );
}
