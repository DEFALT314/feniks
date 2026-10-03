import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { cn } from "@/lib/utils";

// "Wersja pokazowa: wejdź jako…" from design/makiety/Logowanie.dc.html. Plain forms, so it works
// without JavaScript; POST /api/demo/login signs in and redirects to the account's start page.
export function DemoAccountList() {
  return (
    <section aria-labelledby="demo-heading" className="flex flex-[1_1_420px] flex-col gap-3">
      <h2 id="demo-heading" className="font-heading text-[1.75rem] font-bold tracking-tight">
        Wersja pokazowa: wejdź jako…
      </h2>
      <p className="text-muted-foreground">
        Fikcyjne osoby i instytucje. Kliknij jedną z nich, żeby wejść bez hasła.
      </p>
      <ul className="flex flex-col gap-3">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.key}>
            <form action="/api/demo/login" method="post">
              <input type="hidden" name="konto" value={account.key} />
              <button
                type="submit"
                className="border-border text-ink hover:border-navy hover:bg-navy-soft/40 group flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-[10px] border bg-white px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-[0_8px_20px_-12px_rgba(21,26,35,0.25)]"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none",
                    account.avatarClass,
                  )}
                >
                  {account.displayName[0]}
                </span>
                <span className="flex flex-col leading-snug">
                  <strong>{account.displayName}</strong>
                  <span className="text-muted-foreground text-base">{account.description}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
