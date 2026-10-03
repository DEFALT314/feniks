# HubMI mockups (Claude Design)

The reference design for every screen. These are plain HTML files with inline styles: an agent reads a file and ports
the layout to Next.js + Tailwind + the components in `components/ui/`. We don't copy these files into the app and we
don't import `support.js`. The `<dc-import name="Naglowek">` / `"Stopka"` tags stand for the shared header and footer
from `app/layout.tsx`.

| Mockup | Screen | Issue (owner) |
|---|---|---|
| `System.dc.html` | colors, typography, buttons, fields, tags | Makiety i system wizualny (P2) |
| `Logo.dc.html` | logo (wariant C „Razem”), pliki w `design/logo/` | Komponenty UI i układ strony (P2) |
| `Cover.dc.html` | okładka projektu (`design/okladka.png`) | Kompletne zgłoszenie (P1) |
| `Naglowek.dc.html`, `NaglowekMenu.dc.html`, `Stopka.dc.html` | header (one-row menu, account menu, phone menu), footer | Komponenty UI i układ strony (P2) |
| `Main.dc.html` | `/` | Strona główna (P2) |
| `Logowanie.dc.html` | `/login`: e-mail i hasło | Strona główna i wygląd logowania (P2), logika P4 |
| `Rejestracja.dc.html` | `/register`: e-mail i hasło | Strona główna i wygląd logowania (P2), logika P4 |
| `Profil.dc.html` | `/my/profile`: nazwa, rola, prośba o rolę, zmiana hasła, wylogowanie | Profil (P2) |
| `Dopasuj.dc.html` | `/match` | Strona /match (P3) |
| `Biblioteka.dc.html` | `/library` | Biblioteka (P1) |
| `Karta.dc.html` | `/library/[id]` | Karta innowacji (P1) |
| `MapaWyzwan.dc.html` | `/challenge-map` | Mapa Wyzwań (P1) |
| `Kreator.dc.html`, `Fiszka.dc.html` | `/my/creator` | Kreator (P2) |
| `Tester.dc.html` | `/my/tester` | Tester (P2) |
| `Wiadomosci.dc.html` | `/my/messages` | Komunikacja (P4) |
| `Admin.dc.html` | `/admin` | Panel ROPS (P4) |
| `Middleman.dc.html` | `/my/middleman` | Middleman (P3) |

Colors: navy `#1F3A8A`, brick `#C2452B` (focus and accents only), green `#1D6B48`, background `#F6F7F9`,
text `#151A23`, secondary text `#4B5565`, lines `#D9DDE4`. Fonts: Bricolage Grotesque (headings), Atkinson Hyperlegible
Next (body text). The data in the mockups is sample data: the app uses real data from the database, and demo data is
labeled "Dane demonstracyjne" (demo data). Mockup changes: P2 edits the Claude Design artifact "HubMI.pl – makiety",
then exports it here.

Motion: `ruch.js` (GSAP 3.13 + ScrollTrigger from a CDN) plays the motion on every mockup based on `data-ruch`
attributes (`wejscie`, `pokaz`, `licznik`, `slupki`, `postep`, `zakresl`, `tok`, `wybor`, `odswiez`; each one is
described at the top of the file). Hover, press and focus states stay in CSS. GSAP's license is not MIT, Apache, BSD
or ISC (rule 9 in CLAUDE.md), so the app does not use it: `components/ui/motion.tsx` plays the same attributes with
the same timings through the browser's Web Animations API. In a page, put the same `data-ruch` attribute on the same
element as in the mockup; nothing else is needed (bars for `slupki` get `data-ruch-bar`, the list for `odswiez` is
named by `data-ruch-lista`). `prefers-reduced-motion` turns all of it off. `tok` (the `/match` moment) is not
supported yet.
