type Props = {
  title: string;
  moduleName?: string;
};

// Temporary placeholder page. The module owner replaces it with their own view.
export function UnderConstruction({ title, moduleName }: Props) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {moduleName ? <p className="text-muted-foreground mt-2 text-lg">{moduleName}</p> : null}
      <p className="mt-6 text-lg">W budowie</p>
    </main>
  );
}
