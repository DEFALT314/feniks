import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { getCategories, getInnovations } from "@/app/library/_lib/data";
import { homeStats, pickFeatured, plural } from "./_lib/home";

export const metadata: Metadata = {
  title: "HubMI.pl – Małopolski Hub Innowacji Społecznych",
  description:
    "Opisz problem swojej gminy, organizacji albo sąsiedztwa. Pokażemy sprawdzone innowacje społeczne z Małopolski.",
};

// Layout per design/makiety/Main.dc.html
const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-10";
const H2 = "font-heading text-[clamp(1.75rem,4vw,2.125rem)] leading-tight font-bold";
const CARD_LINK =
  "border-line text-ink flex flex-col rounded-xl border bg-white no-underline transition-[border-color,box-shadow,translate] duration-(--duration-fast) hover:-translate-y-0.5 hover:border-[#8a99c7] hover:text-ink hover:shadow-[0_12px_28px_-12px_rgba(21,26,35,0.28)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick motion-reduce:transition-none motion-reduce:hover:translate-y-0";
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
    text: "Kreator przeprowadzi mnie krok po kroku przez kanwę innowacji i przygotuje fiszkę dla ROPS.",
    action: "Otwórz kreator",
    accent: "border-t-brick",
  },
  {
    href: "/library",
    title: "Chcę poznać, co działa",
    text: "Biblioteka innowacji, Mapa Wyzwań Społecznych, raporty i materiały do pobrania.",
    action: "Przejdź do Biblioteki",
    accent: "border-t-success",
  },
] as const;

const AI_RULES = [
  "Wybiera tylko spośród innowacji z Biblioteki ROPS.",
  "Pokazuje słowa, które zdecydowały o dopasowaniu.",
  "Nic nie wysyła ani nie publikuje bez Twojego kliknięcia.",
  "Nie dostaje imion, nazwisk ani adresów.",
];

export default async function Home() {
  const [innovations, categories, areas] = await Promise.all([
    getInnovations(),
    getCategories(),
    getChallengeAreas(),
  ]);
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
      label: `${plural(stats.checkedByRops, "wybrana", "wybrane", "wybranych")} do upowszechniania`,
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
            <p className="text-ink-muted text-[0.9375rem] font-bold">
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
              <p id="example-heading" className="text-ink-muted text-[0.9375rem] font-bold">
                Tak to wygląda
              </p>
              <blockquote className="m-0 text-[1.1875rem]">
                „Tata wraca{" "}
                <mark className="bg-[linear-gradient(transparent_55%,#ffe08a_55%)] px-px text-inherit">
                  ze szpitala
                </mark>{" "}
                po udarze. Nie wiemy, jak zorganizować{" "}
                <mark className="bg-[linear-gradient(transparent_55%,#ffe08a_55%)] px-px text-inherit">
                  opiekę w domu
                </mark>
                .”
              </blockquote>
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

      <section aria-label="Dane na start" className={`${WRAP} py-10`}>
        <dl data-ruch="pokaz" className="m-0 grid grid-cols-2 gap-x-10 gap-y-6 lg:grid-cols-4">
          {statItems.map((s) => (
            <div key={s.label} className="flex flex-col-reverse justify-end">
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

      <section aria-labelledby="ai-heading" className="bg-navy-soft border-y border-[#c9d3ee]">
        <div className={`${WRAP} flex flex-wrap gap-x-16 gap-y-8 py-14`}>
          <div className="flex flex-[1_1_360px] flex-col gap-3">
            <h2 id="ai-heading" className={H2}>
              AI proponuje. Człowiek decyduje.
            </h2>
            <p className="text-ink-muted">
              Model językowy pomaga zrozumieć opis i uzasadnić wybór. Nie podejmuje decyzji za
              nikogo.
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
            <h2 id="featured-heading" className={H2}>
              Wybrane do upowszechniania
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
                  <span className="text-ink-muted text-[0.9375rem]">
                    {categoryName(i.kategoria_id)}
                  </span>
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
