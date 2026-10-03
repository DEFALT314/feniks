# Notatki: innowacje ROPS spoza Biblioteki online (stan 3.10.2026)

Plik z rekordami: /mnt/user-data/outputs/materialy-rops/biblioteka_spoza.json (43 rekordy). Walidacja: JSON się wczytuje, id unikalne, żadne id nie występuje w biblioteka.json, limity długości pól spełnione.

## Główny wniosek

Biblioteka (115) pokrywa w całości IWS 1.0 i prawie w całości Inkubator Dostępności. Brakuje głównie: (a) większości innowacji MIIS (2016-2019) i (b) wszystkich 32 innowacji z IWS 2.0, które są właśnie testowane (ROPS jeszcze ich nie ogłosił w Bibliotece, bo testy trwają). Najlepsze oszacowanie łącznej liczby innowacji przetestowanych w inkubatorach ROPS to około 175-180, czyli mniej niż "200+".

## Dane per program

| Program | Ile raportuje program | W 115 (Biblioteka) | Dodane (spoza) | Widziane, nieopisane | Uwagi |
|---|---|---|---|---|---|
| MIIS 2016-2019 | 42 weszły do testu, 39 ukończyło test, 9 rekomendowanych (strona projektu ROPS) | 14 (9 "złotej dziewiątki" + Terapeuta przestrzeni, Mobilne Centrum Pomocy, Stop otyłości, Centrum antydepresyjne, Therapy Set) | 20 | 5 | Przewodnik (2019) wymienia 39 nazw: 9 + 30 "pozostałych"; 3 innowacje (42 minus 39) nie mają nazw w żadnym źródle |
| Inkubator Dostępności 2019-2022 | 45 przetestowanych, 9 rekomendowanych | 43 | 0 | 1 (Media+) | Publikacja z 2022 wymienia 44 nazwy; 45. nie występuje w publikacji |
| IWS 1.0 2020-2023 | 60 grantów, 9 rekomendowanych; publikacja "Połącz kropki" wymienia 58 | 58 (wszystkie nazwane) | 0 | 0 | 2 granty (60 minus 58) bez nazw w publikacji |
| IWS 2.0 2024-2028 | 32 umowy grantowe (31 aktywnych + 1 rezygnacja), 12 do akceleracji, 9 do upowszechnienia | 0 (6 akcelerowanych to stare innowacje, wszystkie w 115) | 23 | 8 + 1 rezygnacja | Testy w toku, więc `czy_dziala` = null |

Razem nazwane w źródłach: 58 + 44 + 39 + 32 = 173. W Bibliotece: 115. Dodane: 43. Widziane, nieopisane: 14 (5 + 1 + 8) plus 1 rezygnacja. 115 + 43 + 14 + 1 = 173.

Uwaga: IWS 2.0 w Bibliotece nie ma jeszcze żadnej "nowej" innowacji. 6 innowacji z listy akcelerowanych (Edki, Strażnik, Merkury, Łazienki modularne, Puzzle 3D, koMIX życiowy) to innowacje z IWS 1.0 i Inkubatora Dostępności, już obecne w Bibliotece. Etykieta w 115 dla nich to "IWS" lub "Inkubator Dostępności", nie "IWS 2.0".

## Dopasowanie do 115 (weryfikacja duplikatów)

Wszystkie nazwy z publikacji porównane z 115 (dopasowanie rozmyte + ręczna kontrola). Różnice w nazwach, które uznałem za TE SAME innowacje (nie dodane):
- Zaraz jadę (Android) = "Dostępny transport publiczny" (opis w Bibliotece mówi wprost o przeniesieniu "Zaraz jadę" z iOS).
- Rodzinny WTZ = "Rodzinny system wzajemnej pomocy" (prawdopodobne: opis o dorosłych z autyzmem w domach rodzinnych pasuje do nazwy, ale nazwy się różnią; do potwierdzenia z ROPS).
- Health care in Poland / In_Health = "Health Guide PL".
- Dialog (aplikacja dla Afgańczyków, Human Doc) = "Dialog ponad kulturami" (-1); drugi wpis "Dialog ponad kulturami" to model mediacji (inna innowacja o tej samej nazwie).
- E-rzecznik praw seniora-konsumenta = "E-rzecznik konsumenta seniora"; Edki = "Edki - kredki terapeutyczne"; Terapeutyczne kredki, Talerz Zdrowia = "Talerze zdrowia"; Strażnik, Puzzle 3D (druk 3D) = "Puzzle 3D".
- Podobne tematycznie, ale uznane za RÓŻNE innowacje: "Inteligentny system wsparcia MED-box" (MIIS, Instytut Medycyny Innowacyjnej) vs "Inteligentny organizer do leków" (IWS 1.0, inni autorzy i program); MED-box nie został dodany tylko z braku opisu (patrz niżej).
- Powiązania nazw wnioskowane po tym samym wnioskodawcy (rekordy oznaczone "prawdopodobne", wyjaśnienie w polu `zrodlo`): Wnioskomat = "Generator spersonalizowanych pism sądowych…", TonoBok = "System do obsługi BOK…", Świadoma Integracja OzN = "Model Integracji OZN".

## Widziane, ale nieopisane (nie dodane, bo nie da się uczciwie wypełnić opisu i problemu)

MIIS (5, wszystkie w Przewodniku 2019, s. 44-46, tylko tytuł + autor):
- Inteligentny system wsparcia MED-box (Instytut Medycyny Innowacyjnej Sp. z o.o.)
- Cztery zmysły teatru (Teatr Ludowy w Krakowie)
- Przestrzeń Komunikacji (Politechnika Krakowska)
- Samodzielni w podróży (Stowarzyszenie Rodziców i Przyjaciół Dzieci z Zespołem Downa "Tęcza")
- Usługobela (Stowarzyszenie Rodziców i Opiekunów Dzieci Niepełnosprawnych "Dać Szansę" w Wadowicach)

Inkubator Dostępności (1): Media+ (publikacja 2022, s. 43, kategoria "Aplikacje i rozwiązania IT", tylko tytuł i autorzy).

IWS 2.0 (8 + 1):
- Moja historia będzie inna (autorki znane z innowacji adopcyjnej, ale temat wniosku nie jest podany)
- Active Life Towel (na Liście rankingowej: "Ręcznik funkcyjny")
- Gdzie zupa?
- Cyfrowa ścieżka dotykowa (Framica Polska Sp. z o.o.)
- Architekt Czasu
- Pasja Bez Granic
- zAInteresuj się sztuczną inteligencją
- Sąsiedzki Dom Marzeń (Gdyńska Fundacja "Dom Marzeń")
- Migowy Asystent+ (Fundacja Świat Głuchych): rezygnacja z grantu, nie jest testowany

Ranking IWS 2.0 zawierał też 6 projektów, które nie podpisały umów (zastąpiły je pozycje z listy rezerwowej): Personalizowany modularny zespół urządzeń asystujący osobom z dysfunkcją wzroku; Chłopacki narzędziownik; Senior na czasie; Horyzonty Bezradności; Level Up: Kariera; Audiobox. Nie traktuję ich jako innowacji testowanych.

## Jakość opisów (ważne dla zespołu)

- 9 rekordów "pewne": opis oparty na karcie z innowacjespoleczne.pl (CC BY 4.0) lub na jednoznacznym tytule (4 MIIS z kartą/modelem: terapia zajęciowa w domu, Asystent osoby starszej, Model mobilnego SPA, Bazalnie w domu).
- 34 rekordy "prawdopodobne": nazwa, program i instytucja są potwierdzone w publikacji lub na stronie ROPS, ale opis i problem wyprowadziłem wyłącznie z tytułu (zaznaczone w polu `problem` frazą "wniosek z tytułu"). Do dalszego użytku warto pobrać pełne modele od ROPS.
- `kto_moze_wdrozyc` i `czy_dziala` są puste tam, gdzie żadne źródło tego nie podaje. W IWS 2.0 testy trwają, więc `czy_dziala` = null.
- `autor_instytucja` tylko dla organizacji; gdy autor był osobą fizyczną lub firmą nazwaną imieniem i nazwiskiem, pole = null.
- Kategorie dobrane z 9 istniejących; 6 rekordów ma "inne" (zadłużenie, osoby transpłciowe, higiena cyfrowa/zagrożenia cyfrowe, integracja OzN, usługi opiekuńcze międzypokoleniowe).

## Ograniczenia dostępu

- Stare adresy kart MIIS i Inkubatora Dostępności (np. `/innowacje-spoleczne/malopolski-inkubator-innowacji-spolecznych-projekt-zakonczony/pozostale-innowacje-spoleczne-miis,...` oraz `/lewa/innowacje-spoleczne-25/...`) zwracają 404 po przebudowie strony, więc pełnych kart "pozostałych" innowacji nie udało się odczytać z ROPS. Strona 2023.rops.krakow.pl (archiwum) pojawiła się w wynikach wyszukiwania, ale WebFetch jej nie czyta, a w przeglądarce jej nie otwierałem (poza zakresem zadania).
- Nazwy IWS 2.0 pochodzą z "Udzielone granty" i z Listy rankingowej (PDF, Zarządzenie IS-430-1/25 z 21.05.2025). Nie znalazłem opisów tych innowacji ani na ROPS, ani na INNOAGH, ani w innowacjespoleczne.pl (profil IWS 2.0 nie ma podpiętych innowacji).
- innowacjespoleczne.pl: profil MIIS wymienia 15 innowacji (12 w 115 + 3 nowe: Asystent osoby starszej, Model mobilnego SPA, Bazalnie w domu); profil IWS 1.0 wymienia 11 (wszystkie w 115). Profil "Usługi opiekuńcze dla osób niepełnosprawnych [2016-2019]" na tej stronie to INNY inkubator (kontakt: MRPiPS), nie ROPS, więc nie został użyty.

## Szacunek całości vs "200+"

Dowody (źródła ROPS):
- MIIS: 42 innowacje weszły do testu (103 wnioski).
- Inkubator Dostępności: 45 przetestowanych rozwiązań.
- IWS 1.0: 60 grantów (publikacja "Połącz kropki" mówi o setkach zgłoszonych pomysłów).
- IWS 2.0: 32 granty (169 ocenionych pomysłów, 32 zarekomendowane).
- Suma startów: 42 + 45 + 60 + 32 = 179. Suma nazwanych: 173.

Wniosek: dowody wspierają ok. 175-180 innowacji (nie 200+). Możliwe wyjaśnienia "200+": zaokrąglenie w górę/liczenie z projektami w toku lub z kolejnymi edycjami (IWS 2.0 ma trwać do 6.2028, a "Usługa Wrażliwa" wdraża istniejące innowacje, więc ich nie zwiększa), liczenie pomysłów zgłoszonych (103 + 169 + setki w IWS 1.0) zamiast przetestowanych, albo wliczenie innowacji z innych programów ROPS (np. modele usług, "Małopolskie modele usług społecznych", Ośrodek Adopcyjny). Tego nie da się rozstrzygnąć bez ROPS.

## Pytania do mentora ROPS

1. Z czego składa się "200+"? Czy liczy też innowacje spoza czterech inkubatorów lub zgłoszone, nie przetestowane pomysły?
2. Nazwy brakujących pozycji: 2 granty IWS 1.0 (60 minus 58), 45. innowacja Inkubatora Dostępności (publikacja ma 44) oraz 3 innowacje MIIS (42 minus 39). Czym jest Media+?
3. Czy ROPS dopisze innowacje MIIS i IWS 2.0 do Biblioteki po przebudowie, i czy możemy dostać pełne karty/modele (pliki "modele innowacji") dla 25 pozycji MIIS i 32 z IWS 2.0?
4. Które z 6 jeszcze nienazwanych innowacji "z 12 akcelerowanych" w IWS 2.0 to stare pozycje (czy są w 115)?
5. Zasady wykorzystania: karty na innowacjespoleczne.pl mają CC BY 4.0, a licencja kart/PDF ROPS nie jest podana; czy możemy streszczać i linkować wszystkie?
6. Potwierdzenie: czy "Rodzinny WTZ" = "Rodzinny system wzajemnej pomocy" i czy Wnioskomat = "Generator pism sądowych dla osób transpłciowych".
