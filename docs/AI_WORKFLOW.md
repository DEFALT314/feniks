# Jak działa AI w HubMI

Materiał do prezentacji i decku (#28). Każdy diagram pokazuje, **gdzie decyduje człowiek**.
Zasada w całej aplikacji: AI tylko proponuje. Nic z AI nie jest publikowane, zapisywane w fiszce
ani wysyłane do ROPS bez kliknięcia człowieka, a każdy tekst z AI ma etykietę „Propozycja AI”.

## 1. Całość: gdzie aplikacja używa AI

Cztery miejsca korzystają z jednego, wspólnego „rdzenia”. Rdzeń pilnuje bezpieczeństwa i jakości,
zanim cokolwiek trafi do modelu i zanim odpowiedź trafi do człowieka.

```mermaid
flowchart TB
    subgraph Moduly["Moduły aplikacji"]
        M1["Dopasuj rozwiązanie<br/>(problem → innowacje)"]
        M3["Kreator pomysłów<br/>(Sprawdź fiszkę, wniosek,<br/>inne podejścia)"]
        M7["Middleman<br/>(karta usługi dla gminy)"]
    end

    subgraph Rdzen["Wspólny rdzeń AI"]
        direction TB
        P["1. Usuwanie danych osobowych<br/>(telefon, e-mail, PESEL)"]
        L["2. Limity<br/>na adres IP i dzienne na konto"]
        R["3. Pamięć odpowiedzi<br/>i tryb powtórki na scenę"]
        Q["4. Model językowy DeepSeek"]
        V["5. Sprawdzenie odpowiedzi<br/>(format, tylko podane identyfikatory,<br/>dosłowne cytaty, bez wymyślonych liczb)<br/>jedna ponowna próba"]
    end

    E["Wyszukiwarka znaczeniowa<br/>model mmlw-e5-base + wektory<br/>w bazie (pgvector)"]

    M1 --> E
    M3 --> E
    M1 --> P
    M3 --> P
    M7 --> P
    P --> L --> R --> Q --> V

    V --> H{"Człowiek decyduje:<br/>Użyj, Dopisz, Wyślij"}
    H -->|tak| OUT["Fiszka, karta usługi<br/>albo wiadomość do ROPS"]
    H -->|nie| X["Propozycja znika"]
    OUT --> ROPS["Panel ROPS:<br/>ocenia człowiek"]
```

Co dzieje się w rdzeniu:

- **Dane osobowe** są usuwane, zanim tekst wyjdzie z aplikacji (`lib/ai/privacy.ts`).
- **Limity** chronią budżet: 20 zapytań AI na godzinę z jednego adresu w wyszukiwarce, 30 w Kreatorze
  i Middlemanie, do tego 100 dziennie na konto (`ai_usage`).
- **Pamięć odpowiedzi** (`ai_cache`) sprawia, że to samo pytanie nie kosztuje drugi raz.
  **Tryb powtórki** (`AI_REPLAY`) odtwarza nagrane odpowiedzi na scenie, nawet gdy sieć zawiedzie.
- **Model wybiera tylko z tego, co dostał**: z listy innowacji, wyzwań albo odpowiedzi z kanwy.
  Odpowiedź spoza listy jest odrzucana, cytat, którego nie ma w karcie, znika.

## 2. Dopasuj rozwiązanie (moduł I)

Mieszkaniec, gmina albo organizacja opisuje problem własnymi słowami. Najpierw w ułamku sekundy
pokazujemy wyniki wyszukiwarki, a AI w tym czasie wybiera najlepsze i uzasadnia wybór.

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant S as Strona /match
    participant W as Wyszukiwarka
    participant AI as Model AI
    participant B as Baza (statystyki)

    U->>S: Opisuje problem własnymi słowami
    S->>W: Szukaj bez AI
    Note over W: Słowa kluczowe (BM25)<br/>+ znaczenie (wektory)<br/>wynik = 0,8 × znaczenie + 0,2 × słowa
    W-->>S: Wstępna lista innowacji (pod 1 s)
    S-->>U: Pokazuje wstępne wyniki
    S->>W: Szukaj z AI
    W->>AI: 15 kandydatów z Biblioteki<br/>+ 48 wyzwań z Mapy Wyzwań
    Note over AI: Wybiera najwyżej 3 innowacje<br/>tylko z listy albo „brak”<br/>+ 1 wyzwanie z listy
    AI-->>W: Wybór, uzasadnienie, cytat
    Note over W: Cytat musi być dosłownie w karcie<br/>identyfikatory spoza listy odrzucone
    W->>B: Tylko obszar i wyzwanie<br/>(bez treści opisu)
    W-->>S: Wynik z etykietą „Propozycja AI”
    S-->>U: Wyzwanie, 3 innowacje, podświetlone słowa
    Note over U: Sam decyduje: karta innowacji,<br/>karta usługi albo „Zgłoś potrzebę”
    Note over B: Panel ROPS: trendy potrzeb<br/>w regionie
```

Gdy w Bibliotece nie ma rozwiązania, strona mówi to wprost („takiego rozwiązania jeszcze nie ma”)
i proponuje zgłoszenie potrzeby do ROPS, zamiast udawać dopasowanie.

## 3. Kreator pomysłów (moduł III)

AI nie przepisuje fiszki za autora. Wskazuje, co zmienić i skąd to wie.

```mermaid
flowchart TD
    A["Autor: kanwa (22 pytania) i fiszka"] --> C1["Sprawdź fiszkę"]
    A --> C2["Wniosek pod nabór"]
    A --> C3["Inne podejścia"]
    A --> C4["Coś podobnego już działa"]

    C1 --> R1["Reguły z odpowiedzi z kanwy<br/>np. „Nie wiadomo, kto zapłaci”"]
    C1 --> R2["AI porównuje z podobnymi<br/>innowacjami z Biblioteki"]
    R1 --> D1["Uwagi z dowodem:<br/>odpowiedź z kanwy<br/>albo dosłowny cytat z karty"]
    R2 --> D1

    C2 --> N1["Nabory opublikowane<br/>w Panelu ROPS"]
    N1 --> D2["Szkic wniosku z kanwy<br/>budżet z zaznaczonych kosztów: [kwota]<br/>ocena dopasowania i lista braków"]

    C3 --> D3["2–3 nietypowe sposoby<br/>na ten sam problem"]
    C4 --> D4["Najbliższa innowacja<br/>z Biblioteki (bez AI)"]

    D1 --> H{"Autor klika:<br/>Dopisz zdanie, Przejdź do pola,<br/>Popraw w kanwie albo Pomiń"}
    D2 --> H2{"Autor poprawia<br/>i kopiuje wniosek"}
    D3 --> H3{"Autor klika<br/>Dodaj do opisu"}

    H --> F["Fiszka"]
    H3 --> F
    F --> S["Wyślij do ROPS<br/>(tylko kliknięciem autora)"]
    S --> P["Panel ROPS: człowiek ocenia<br/>i odpisuje autorowi"]
```

- **Sprawdź fiszkę** łączy reguły policzone z kanwy (zawsze prawdziwe) z najwyżej trzema uwagami AI.
  Każda uwaga ma źródło: pytanie z kanwy albo cytat z podobnej innowacji z linkiem do karty.
- **Wniosek pod nabór**: AI nie wpisuje liczb ani kwot. Budżet to lista kosztów zaznaczonych przez
  autora w kanwie, każdy z miejscem `[kwota]` do uzupełnienia.

## 4. Middleman (moduł VII)

Gmina, ośrodek pomocy albo organizacja zamienia innowację z Biblioteki w kartę usługi, którą może
zamówić i sfinansować.

```mermaid
flowchart TB
    U["Gmina, GOPS albo NGO<br/>wybiera innowację"] --> F["Fakty z danych, bez AI:<br/>czy pasuje do tej instytucji,<br/>materiały od autorów, nabory"]
    U --> AI["AI pisze szkic karty:<br/>dla kogo, jak działa,<br/>kto realizuje, na co uważać,<br/>pierwsze kroki"]
    AI --> G["Sprawdzenie: bez kosztów i liczb,<br/>bez pustych haseł"]
    F --> K["Karta usługi<br/>„Propozycja AI”"]
    G --> K
    K --> E{"Instytucja poprawia<br/>i uzupełnia koszt"}
    E --> W["Wyślij do ROPS<br/>(kliknięciem)"]
    W --> R["ROPS konsultuje kartę"]
```

## 5. Wyniki pomiarów

Zmierzone na zestawach testowych (`evals/results.md`):

| Co mierzymy | Wynik |
|---|---|
| Właściwa innowacja w pierwszej trójce, 230 pytań od ROPS | **100%** |
| To samo dla pytań potocznych (40) i nietypowych: literówki, bez polskich znaków, po ukraińsku (41) | **100%** i **98%** |
| Właściwe wyzwanie z Mapy Wyzwań, gdy wybiera AI (48 pytań) | **96%** |
| Problemy spoza Biblioteki rozpoznane jako „brak rozwiązania” (80 pytań) | **94%** |

Wymaganie ROPS: co najmniej 80% w pierwszej trójce.
