type Props = {
  tytul: string;
  modul?: string;
};

// Tymczasowa strona-zaślepka. Właściciel modułu zastępuje ją własnym widokiem.
export function WBudowie({ tytul, modul }: Props) {
  return (
    <main id="tresc" className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{tytul}</h1>
      {modul ? <p className="text-muted-foreground mt-2 text-lg">{modul}</p> : null}
      <p className="mt-6 text-lg">W budowie</p>
    </main>
  );
}
