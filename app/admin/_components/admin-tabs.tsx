import Link from "next/link";
import { cn } from "@/lib/utils";

// Panel sections from design/makiety/Admin.dc.html. Other owners add their sub-pages here
// (P1: /admin/innovations, /admin/trends; P4: /admin/calls) when they exist.
type Tab = { label: string; href: string };

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
