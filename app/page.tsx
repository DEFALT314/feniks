import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { accountItemsFor, navItemsFor } from "@/components/ui/navigation";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { getCategories, getInnovations } from "@/app/library/_lib/data";
import { getCurrentUser, headerName } from "@/lib/auth";
import { homeStats, personalTiles, pickFeatured, plural } from "./_lib/home";

export const metadata: Metadata = {
  title: "HubMI.pl – Małopolski Hub Innowacji Społecznych",
  description:
    "Opisz problem swojej gminy, organizacji albo sąsiedztwa. Pokażemy sprawdzone innowacje społeczne z Małopolski.",
};

// Layout per design/makiety/Main.dc.html
const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-10";
const H2 = "font-heading text-[clamp(1.75rem,4vw,2.125rem)] leading-tight font-bold";
const CARD_LINK =
  "border-line text-ink flex flex-col rounded-xl border bg-white no-underline transition-[border-color,box-shadow,translate] duration-(--duration-fast) hover:-translate-y-0.5 hover:border-[#8a99c7] hover:text-ink hover:shadow-[0_12px_28px_-12px_rgba(21,26,35,0.28)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const ARROW =
  "ml-[0.3em] inline-block transition-transform duration-(--duration-fast) group-hover:translate-x-1 motion-reduce:transition-none";

// The example in the hero; the innovations themselves come from the Library
const EXAMPLE_IDS = [
  "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
  "terapeuta-przestrzeni",
];
const FEATURED_IDS = [
  "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
  "merkury",
  "teleasystent",
];

const ENTRIES = [
  {
    href: "/match",
    title: "Mam problem",
    text: "Szukam sprawdzonego rozwiązania dla gminy, ośrodka, organizacji albo sąsiedztwa.",
    action: "Dopasuj rozwiązanie",
    accent: "border-t-navy",
  },
  {
    href: "/my/creator",
    title: "Mam pomysł",
    text: "Odpowiem na proste pytania o mój pomysł. Z odpowiedzi powstanie fiszka, czyli krótki opis pomysłu dla ROPS.",
    action: "Otwórz kreator",
    accent: "border-t-brick",
  },
  {
    href: "/library",
    title: "Chcę poznać, co działa",
    text: "Przejrzę Bibliotekę innowacji, Mapę Wyzwań i raporty ROPS.",
    action: "Przejdź do Biblioteki",
    accent: "border-t-success",
  },
] as const;

// "Jak to działa": the whole path, including how ROPS hears about it and how the answer comes back
const STEPS = [
  {
    title: "Opisz sprawę swoimi słowami",
    text: "Tak, jak opowiadasz sąsiadowi. Nie trzeba znać fachowych słów ani wypełniać wniosków.",
  },
  {
    title: "Zobacz, co już działa",
    text: "HubMI pokaże sprawdzone innowacje z Biblioteki ROPS i wyjaśni, dlaczego pasują.",
  },
  {
    title: "Wyślij pomysł albo pytanie do ROPS",
    text: "Pracownik ROPS od razu dostaje powiadomienie. Odpowiedź zobaczysz pod dzwonkiem i w poczcie e-mail.",
  },
] as const;

// Who HubMI is for and where each of them starts (one click to their main task)
const AUDIENCES = [
  { who: "Mieszkańcy i opiekunowie", task: "Opisz problem", href: "/match" },
  {
    who: "Gminy i ośrodki pomocy społecznej",
    task: "Przygotuj kartę usługi",
    href: "/my/middleman",
  },
  { who: "Organizacje pozarządowe", task: "Zgłoś pomysł", href: "/my/creator" },
  { who: "Eksperci i testerzy", task: "Oceń rozwiązania", href: "/my/tester" },
  { who: "Pracownicy ROPS", task: "Otwórz Panel ROPS", href: "/admin" },
] as const;

const AI_RULES = [
  "Wybiera tylko spośród innowacji z Biblioteki ROPS.",
  "Pokazuje słowa, które zdecydowały o dopasowaniu.",
  "Nic nie wysyła ani nie publikuje bez Twojego kliknięcia.",
  "Nie dostaje imion, nazwisk ani adresów.",
];

export default async function Home() {
  const [innovations, categories, areas, user] = await Promise.all([
    getInnovations(),
    getCategories(),
    getChallengeAreas(),
    getCurrentUser(),
  ]);
  const tiles = user ? personalTiles(navItemsFor(user.role), accountItemsFor(user.role)) : [];
  const stats = homeStats(innovations, categories, areas);
  const categoryName = (id: string) => categories.find((k) => k.id === id)?.nazwa ?? "";
  const example = EXAMPLE_IDS.flatMap((id) => innovations.filter((i) => i.id === id));
  const featured = pickFeatured(innovations, FEATURED_IDS);

  const statItems = [
    {
      value: stats.libraryInnovations,
      label: `${plural(stats.libraryInnovations, "innowacja", "innowacje", "innowacji")} w Bibliotece ROPS`,
    },
    {
      value: stats.checkedByRops,
      label: `${plural(stats.checkedByRops, "sprawdzona", "sprawdzone", "sprawdzonych")} przez ROPS`,
    },
    {
      value: stats.challenges,
      label: `${plural(stats.challenges, "wyzwanie", "wyzwania", "wyzwań")} na Mapie Wyzwań`,
    },
    {
      value: stats.categories,
      label: `${plural(stats.categories, "kategoria", "kategorie", "kategorii")}, od seniorów po rynek pracy`,
    },
  ];

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <section className="border-line border-b bg-white">
        <div className={`${WRAP} flex flex-wrap items-center gap-12 py-12 sm:py-[72px]`}>
          <div data-ruch="wejscie" className="flex flex-[1_1_520px] flex-col gap-[22px]">
            <p className="text-ink-muted text-base font-bold">
              Małopolski Hub Innowacji Społecznych
            </p>
            <h1 className="font-heading text-[clamp(2.5rem,7vw,3.625rem)] leading-[1.1] font-bold tracking-tight">
              Ktoś już to rozwiązał. Połączymy Was.
            </h1>
            <p className="max-w-[600px] text-[1.3125rem]">
              Opisz problem swojej gminy, organizacji albo sąsiedztwa. Pokażemy sprawdzone innowacje
              społeczne z Małopolski i pomożemy je u Was wdrożyć.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/match" className={buttonVariants({ variant: "primary" })}>
                Opisz problem
              </Link>
              <Link href="/my/creator" className={buttonVariants({ variant: "secondary" })}>
                Mam własny pomysł
              </Link>
            </div>
          </div>

          {example.length ? (
            <figure
              data-ruch="wejscie zakresl"
              aria-labelledby="example-heading"
              className="m-0 flex flex-[1_1_420px] flex-col gap-4 rounded-xl border border-[#b8c0cd] bg-white p-7"
            >
              <p id="example-heading" className="text-ink-muted text-base font-bold">
                Przykład
              </p>
              <blockquote className="m-0 text-[1.1875rem]">
                „Tata wraca{" "}
                <mark className="decoration-warning bg-transparent bg-[linear-gradient(transparent_55%,#ffe08a_55%)] px-px text-inherit underline decoration-2 underline-offset-4">
                  ze szpitala
                </mark>{" "}
                po udarze. Nie wiemy, jak zorganizować{" "}
                <mark className="decoration-warning bg-transparent bg-[linear-gradient(transparent_55%,#ffe08a_55%)] px-px text-inherit underline decoration-2 underline-offset-4">
                  opiekę w domu
                </mark>
                .”
              </blockquote>
              <p className="text-ink-muted text-base">
                Podkreślone słowa zdecydowały o dopasowaniu.
              </p>
              {example.map((i) => (
                <div key={i.id} className="border-line flex flex-col gap-1.5 border-t pt-4">
                  <Link
                    href={`/library/${i.id}`}
                    className="text-ink hover:text-navy flex min-h-11 items-center text-[1.1875rem] leading-snug font-bold no-underline hover:underline"
                  >
                    {i.nazwa}
                  </Link>
                  <span className="text-ink-muted text-base">
                    {categoryName(i.kategoria_id)}
                    {i.sprawdzona_przez_rops ? (
                      <>
                        {" · "}
                        <span className="text-success font-bold">sprawdzona przez ROPS</span>
                      </>
                    ) : null}
                  </span>
                </div>
              ))}
            </figure>
          ) : null}
        </div>
      </section>

      {tiles.length ? (
        <section aria-labelledby="own-heading" className={`${WRAP} flex flex-col gap-5 pt-10`}>
          <h2 id="own-heading" className={H2}>
            Twoje sprawy, {headerName(user!)}
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t, i) => (
              <li key={t.href} className="flex">
                <Link
                  href={t.href}
                  className={`${CARD_LINK} group w-full gap-2 p-6 ${i === 0 ? "border-navy border-2" : ""}`}
                >
                  <strong className="font-heading text-xl leading-tight">
                    {t.title}
                    <span className={ARROW} aria-hidden="true">
                      →
                    </span>
                  </strong>
                  <span className="text-ink-muted text-base">{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="HubMI w liczbach" className={`${WRAP} py-10`}>
        {/* min-w-0 and the narrower gap on phones: long words like "upowszechniania" wrap inside
            the column at 320 px with A+ instead of pushing the page sideways (WCAG 1.4.10) */}
        <dl
          data-ruch="pokaz"
          className="m-0 grid grid-cols-1 gap-x-6 gap-y-6 min-[360px]:grid-cols-2 sm:gap-x-10 lg:grid-cols-4"
        >
          {statItems.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end">
              <dt className="text-ink-muted font-normal">{s.label}</dt>
              <dd
                data-ruch="licznik"
                className="font-heading m-0 text-[2.5rem] leading-[1.1] font-bold tabular-nums"
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="start-heading" className={`${WRAP} flex flex-col gap-6 pt-6 pb-16`}>
        <h2 id="start-heading" className={H2}>
          Od czego zaczynasz?
        </h2>
        <ul data-ruch="pokaz" className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
          {ENTRIES.map((e) => (
            <li key={e.href} className="flex">
              <Link
                href={e.href}
                className={`${CARD_LINK} group w-full gap-2.5 border-t-4 p-7 ${e.accent}`}
              >
                <strong className="font-heading text-2xl leading-tight">{e.title}</strong>
                <span className="text-ink-muted">{e.text}</span>
                <span className="text-navy mt-1.5 font-bold">
                  {e.action}
                  <span className={ARROW} aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="border-line border-t bg-white">
        <div className={`${WRAP} grid gap-x-16 gap-y-10 py-14 lg:grid-cols-[3fr_2fr]`}>
          <div className="flex flex-col gap-6">
            <h2 id="how-heading" className={H2}>
              Jak to działa
            </h2>
            <ol className="m-0 flex list-none flex-col gap-5 p-0">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="bg-navy font-heading flex size-11 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <strong className="text-xl leading-snug">{step.title}</strong>
                    <span className="text-ink-muted">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-4">
            <h2 id="audience-heading" className="font-heading text-2xl leading-tight font-bold">
              Dla kogo jest HubMI
            </h2>
            <ul aria-labelledby="audience-heading" className="m-0 flex list-none flex-col p-0">
              {AUDIENCES.map((a) => (
                <li key={a.href} className="border-line border-b last:border-b-0">
                  <Link
                    href={a.href}
                    className="text-ink hover:text-navy group flex min-h-11 flex-col gap-0.5 py-3 no-underline"
                  >
                    <span>{a.who}</span>
                    <span className="text-navy font-bold">
                      {a.task}
                      <span className={ARROW} aria-hidden="true">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="ai-heading" className="bg-navy-soft border-y border-[#c9d3ee]">
        <div className={`${WRAP} flex flex-wrap gap-x-16 gap-y-8 py-14`}>
          <div className="flex flex-[1_1_360px] flex-col gap-3">
            <h2 id="ai-heading" className={H2}>
              AI proponuje. Człowiek decyduje.
            </h2>
            <p className="text-ink-muted">
              AI podpowiada, które innowacje pasują do Twojego opisu, i wyjaśnia dlaczego.
            </p>
          </div>
          <ul
            data-ruch="pokaz"
            className="m-0 grid flex-[2_1_520px] list-disc gap-x-8 gap-y-3 pl-[22px] sm:grid-cols-2"
          >
            {AI_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>

      {featured.length ? (
        <section
          aria-labelledby="featured-heading"
          className={`${WRAP} flex flex-col gap-6 pt-16 pb-[72px]`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="featured-heading" className={`${H2} min-w-0`}>
              Sprawdzone przez ROPS
            </h2>
            <Link
              href="/library"
              className="text-navy group inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]"
            >
              Cała Biblioteka
              <span className={ARROW} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
          <ul data-ruch="pokaz" className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
            {featured.map((i) => (
              <li key={i.id} className="flex">
                <Link href={`/library/${i.id}`} className={`${CARD_LINK} w-full gap-2 p-6`}>
                  <span className="text-ink-muted text-base">{categoryName(i.kategoria_id)}</span>
                  <strong className="text-xl leading-snug">{i.nazwa}</strong>
                  {i.opis_krotki ? (
                    <span className="text-ink-muted line-clamp-3">{i.opis_krotki}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
