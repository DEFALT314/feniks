import Link from "next/link";

// Panel sections from design/makiety/Admin.dc.html; the idea queue, roles and calls come with #5, #6 and #10
const SECTIONS = [
  { href: "/admin", label: "Nowe pomysły" },
  { href: "/admin/library", label: "Biblioteka" },
  { href: "/admin/trends", label: "Potrzeby w regionie" },
] as const;

export function AdminNav({ current }: { current: (typeof SECTIONS)[number]["href"] }) {
  return (
    <div className="border-border border-b bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-8 sm:px-10">
        <p className="text-muted-foreground text-base font-bold">Panel ROPS</p>
        <nav aria-label="Sekcje panelu">
          <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-1 p-0">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={s.href === current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-[3px] text-[1.0625rem] no-underline ${
                    s.href === current
                      ? "border-navy text-navy font-bold"
                      : "text-ink hover:text-navy border-transparent"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
