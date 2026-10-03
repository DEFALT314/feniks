import Link from "next/link";
import { cn } from "@/lib/utils";

// Panel sections from design/makiety/Admin.dc.html. Other owners add their sub-pages here
// when they exist.
type Tab = { label: string; href: string };

export const ADMIN_TABS: Tab[] = [
  { label: "Nowe pomysły", href: "/admin" },
  { label: "Prośby o rolę", href: "/admin/roles" },
  { label: "Biblioteka", href: "/admin/library" },
  { label: "Karty usług", href: "/admin/cards" },
  { label: "Nabory", href: "/admin/calls" },
  { label: "Potrzeby w regionie", href: "/admin/trends" },
];

export function AdminTabs({ current, tabs }: { current: string; tabs: Tab[] }) {
  return (
    <nav aria-label="Sekcje panelu" className="flex flex-wrap gap-x-7 gap-y-1">
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[46px] items-center border-b-[3px] text-[1.0625rem] no-underline transition-colors duration-200",
              active
                ? "border-navy text-navy font-bold"
                : "text-ink hover:text-navy border-transparent hover:border-[#B8C0CD]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
