// Educational materials (task module II): short guides in plain language, written by the team.
// Links lead to the app's own modules, so each guide ends with something the reader can do.

export type GuideLink = { label: string; href: string };
export type Guide = {
  id: string;
  title: string;
  forWhom: string;
  intro: string;
  steps: string[];
  links: GuideLink[];
};

export const GUIDES: Guide[] = [
  {
    id: "czym-jest-innowacja",
    title: "Czym jest innowacja społeczna?",
    forWhom: "Dla każdego",
    intro:
      "To nowy albo lepszy sposób na rozwiązanie problemu ludzi, sprawdzony w praktyce i możliwy do powtórzenia w innym miejscu. Może to być przedmiot, usługa, metoda pracy albo aplikacja.",
    steps: [
      "Odpowiada na prawdziwą potrzebę konkretnej grupy, na przykład seniorów mieszkających samotnie.",
      "Została przetestowana z ludźmi, dla których powstała.",
      "Ma opis i materiały, dzięki którym inna gmina albo organizacja może ją wdrożyć.",
    ],
    links: [
      { label: "Przykład: BaWita, tablica do ćwiczenia pamięci", href: "/library/bawita" },
      { label: "Przykład: Merkury, trening obsługi bankomatu", href: "/library/merkury" },
      { label: "Przeglądaj Bibliotekę innowacji", href: "/library" },
    ],
  },
  {
    id: "od-problemu-do-pomyslu",
    title: "Od problemu do pomysłu",
    forWhom: "Dla mieszkańców i organizacji",
    intro:
      "Masz pomysł, jak pomóc ludziom w swojej okolicy? Zacznij od problemu, nie od rozwiązania.",
    steps: [
      "Opisz problem własnymi słowami: kogo dotyczy, gdzie i jak często się zdarza.",
      "Sprawdź, czy ktoś już go rozwiązał. Często wystarczy wdrożyć gotową innowację.",
      "Jeśli nic nie pasuje, opisz swój pomysł krok po kroku na kanwie innowacji.",
      "Wyślij fiszkę pomysłu do ROPS. Dostaniesz odpowiedź i, jeśli trzeba, wsparcie eksperta.",
    ],
    links: [
      { label: "Opisz problem i znajdź rozwiązanie", href: "/match" },
      { label: "Zgłoś pomysł w Kreatorze", href: "/my/creator" },
      { label: "Zobacz wyzwania z Mapy Wyzwań", href: "/challenge-map" },
    ],
  },
  {
    id: "jak-testowac",
    title: "Jak przetestować innowację",
    forWhom: "Dla autorów pomysłów",
    intro:
      "Test w małej skali pokazuje, czy pomysł naprawdę działa, zanim wydasz na niego dużo pieniędzy.",
    steps: [
      "Zaproś do testu osoby, dla których jest rozwiązanie, a nie tylko znajomych.",
      "Ustal wcześniej, co chcesz sprawdzić, na przykład czy senior sam obsłuży urządzenie.",
      "Zbieraj opinie: co działało, co było trudne, co poprawić.",
      "Popraw rozwiązanie i opisz wyniki. To przyda się przy wniosku o dofinansowanie.",
    ],
    links: [
      { label: "Testuj innowacje i dziel się opinią", href: "/my/tester" },
      { label: "Raporty z badań ROPS", href: "/resources?type=raport" },
    ],
  },
  {
    id: "wdrozenie-w-gminie",
    title: "Jak wdrożyć sprawdzoną innowację w gminie",
    forWhom: "Dla gmin, ośrodków pomocy społecznej i innych instytucji",
    intro:
      "Nie musisz wymyślać koła od nowa. W Bibliotece są rozwiązania przetestowane w Małopolsce.",
    steps: [
      "Wybierz innowację pasującą do potrzeb mieszkańców. Zwróć uwagę na etykietę „Sprawdzona przez ROPS”.",
      "Przeczytaj materiały i zasady wykorzystania na karcie innowacji.",
      "Przygotuj kartę usługi: kto ją prowadzi, ile kosztuje, od czego zacząć.",
      "Zapytaj ROPS o wsparcie i sprawdź aktualne nabory na dofinansowanie.",
    ],
    links: [
      { label: "Biblioteka: tylko sprawdzone przez ROPS", href: "/library?verified=1" },
      { label: "Przygotuj kartę usługi dla swojej instytucji", href: "/my/middleman" },
    ],
  },
];

// Short glossary of words that appear across the app
export const GLOSSARY: { term: string; meaning: string }[] = [
  {
    term: "Inkubator innowacji",
    meaning:
      "Program ROPS, w którym autorzy dostają wsparcie i pieniądze na przetestowanie pomysłu.",
  },
  {
    term: "Upowszechnianie",
    meaning: "Wdrażanie sprawdzonej innowacji w kolejnych gminach i instytucjach.",
  },
  {
    term: "Nabór",
    meaning: "Czas, w którym można poprosić o pieniądze na swój pomysł.",
  },
  {
    term: "Kanwa innowacji",
    meaning: "Zestaw pytań, które pomagają krok po kroku opisać pomysł i sprawdzić jego sens.",
  },
  {
    term: "Karta usługi",
    meaning: "Opis, jak dana instytucja może prowadzić innowację: kto, za ile, od czego zacząć.",
  },
  // Abbreviations used in the titles of ROPS reports
  {
    term: "JST",
    meaning: "Jednostka samorządu terytorialnego, czyli gmina, powiat albo województwo.",
  },
  {
    term: "PES",
    meaning:
      "Podmiot ekonomii społecznej, na przykład spółdzielnia socjalna albo fundacja, która zatrudnia osoby potrzebujące wsparcia.",
  },
  {
    term: "PS",
    meaning: "Przedsiębiorstwo społeczne: firma, która zarabia, żeby pomagać ludziom.",
  },
  {
    term: "NGO",
    meaning: "Organizacja pozarządowa, na przykład stowarzyszenie albo fundacja.",
  },
];
