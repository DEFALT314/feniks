# Koszt utrzymania HubMI.pl (szkic do zgłoszenia)

Stan cen: 3.10.2026, ceny netto (bez VAT), kurs NBP 3,8881 zł/USD (tabela 192/A/NBP/2026 z 2.10.2026).
Założenie: całe województwo, ok. 2000 zapytań Matchmakingu i 300 długich dokumentów AI (wnioski, karty usług) miesięcznie.
Koszt AI zastąpimy zmierzonym w demo (P3).

## Wariant chmurowy

| Pozycja | Co | USD / mies. | Źródło |
|---|---|---|---|
| Aplikacja | Vercel Pro, 1 stanowisko (1 TB transferu, 1 mln wywołań funkcji) | 20,00 | vercel.com/pricing |
| Baza, pliki, powiadomienia | Supabase Pro, instancja Micro w kredycie, 8 GB bazy, 100 tys. aktywnych użytkowników | 25,00 | supabase.com/pricing |
| Konto Hugging Face | PRO (zawiera 2 USD kredytu na modele) | 9,00 | huggingface.co/pricing |
| Embeddingi | Space CPU Upgrade 24/7 (0,03 USD × 730 h), bez usypiania | 21,90 | huggingface.co/docs/hub/spaces-overview |
| Teksty AI | DeepSeek V4.1 Flash przez router HF (deepinfra: 0,20 / 0,60 USD za 1 mln tokenów) | 2,43 | router.huggingface.co/v1/models |
| Maile | Resend, darmowy plan (3000 / mies., 100 / dzień) | 0,00 | resend.com/pricing |
| **Razem** | | **ok. 78** | |

**Ok. 300 zł miesięcznie** (widełki 300–330 zł z zapasem na droższego dostawcę modelu i instancję Small Supabase).

Obliczenie AI: zapytania 2000 × (3 tys. tokenów na wejściu + 0,6 tys. na wyjściu), dokumenty 300 × (4 tys. + 1,5 tys.)
→ 7,2 mln tokenów wejścia i 1,65 mln wyjścia → 7,2 × 0,20 + 1,65 × 0,60 = 2,43 USD. U innego dostawcy (novita) 4,14 USD.

Wariant oszczędny: Space na darmowym CPU (usypia się, rozgrzewany cronem) → ok. 56 USD, czyli **ok. 220 zł**.

## Wariant na serwerze ROPS lub UMWM
Kontener Docker z aplikacją, Postgres z pgvector i modelem embeddingów (ok. 0,5 GB) na istniejącym serwerze.
Teksty AI przez tego samego dostawcę (kilka zł miesięcznie) albo polski model Bielik na serwerze z GPU (koszt sprzętu).

## Ludzie
0,25 etatu redaktora treści w ROPS (Biblioteka, moderacja pomysłów), 0,1 etatu administratora IT, eksperci według potrzeb.

## Skalowalność
Aplikacja bez stanu, baza z indeksami, embeddingi katalogu liczone raz, pamięć odpowiedzi AI (ai_cache) ogranicza
liczbę wywołań. 10× więcej zapytań to wzrost kosztu AI o ok. 25 USD, a reszta stoi w miejscu.

## Do potwierdzenia
- Czy Space typu Docker wymaga konta PRO (subagent tak twierdzi, P3 sprawdzi przy wdrożeniu).
- Limity Storage i transferu w Supabase Pro (nie udało się zweryfikować).
