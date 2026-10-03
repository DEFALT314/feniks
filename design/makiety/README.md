# Makiety HubMI (Claude Design)

Wzór wyglądu każdego ekranu. To zwykły HTML ze stylami w atrybutach: agent czyta plik i przenosi układ
na Next.js + Tailwind + komponenty z `components/ui/`. Nie kopiujemy plików do aplikacji, nie importujemy `support.js`.
Znaczniki `<dc-import name="Naglowek">` / `"Stopka"` = wspólny nagłówek i stopka z `app/layout.tsx`.

| Makieta | Ekran | Issue (właściciel) |
|---|---|---|
| `System.dc.html` | kolory, typografia, przyciski, pola, etykiety | Makiety i system wizualny (P2) |
| `Naglowek.dc.html`, `Stopka.dc.html` | nagłówek, stopka | Komponenty UI i układ strony (P2) |
| `Main.dc.html` | `/` | Strona główna (P2) |
| `Logowanie.dc.html` | `/logowanie`, „Wejdź jako…” | Strona główna (P2), Konta demo (P4) |
| `Dopasuj.dc.html` | `/dopasuj` | Strona /dopasuj (P3) |
| `Biblioteka.dc.html` | `/biblioteka` | Biblioteka (P1) |
| `Karta.dc.html` | `/biblioteka/[id]` | Karta innowacji (P1) |
| `MapaWyzwan.dc.html` | `/mapa-wyzwan` | Mapa Wyzwań (P1) |
| `Kreator.dc.html`, `Fiszka.dc.html` | `/moje/kreator` | Kreator (P2) |
| `Tester.dc.html` | `/moje/tester` | Tester (P2) |
| `Wiadomosci.dc.html` | `/moje/wiadomosci` | Komunikacja (P4) |
| `Admin.dc.html` | `/admin` | Panel ROPS (P4) |
| `Middleman.dc.html` | `/moje/middleman` | Middleman (P3) |

Kolory: granat `#1F3A8A`, cegła `#C2452B` (tylko fokus i akcenty), zieleń `#1D6B48`, tło `#F6F7F9`, tekst `#151A23`,
drugorzędny `#4B5565`, linie `#D9DDE4`. Fonty: Bricolage Grotesque (nagłówki), Atkinson Hyperlegible Next (tekst).
Dane na makietach są przykładowe: w aplikacji bierzemy prawdziwe z bazy, a pokazowe oznaczamy „Dane demonstracyjne”.
Zmiany w makietach: P2 (artefakt Claude Design „HubMI.pl – makiety”), potem eksport tutaj.

Ruch: `ruch.js` (GSAP 3.13 + ScrollTrigger z CDN) odtwarza ruch na każdym ekranie według atrybutów `data-ruch`
(`wejscie`, `pokaz`, `licznik`, `slupki`, `postep`, `zakresl`, `tok`, `wybor`, `odswiez`; opis na początku pliku).
Hover, wciśnięcie i fokus zostają w CSS. W aplikacji przenosimy te same sekwencje do komponentów przez `useGSAP()`
z `@gsap/react` (scope = ref kontenera, `gsap.matchMedia()` dla `prefers-reduced-motion`). Moment ekranu `/dopasuj`
to jedna oś czasu, odtwarzana od nowa po kliknięciu „Dopasuj”.
