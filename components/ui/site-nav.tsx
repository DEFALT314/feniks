"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "./navigation";

export function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu główne"
      className="flex flex-[1_1_480px] flex-wrap gap-x-5 gap-y-1 self-stretch"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center border-b-[3px] text-[17px] no-underline transition-colors duration-200",
              active
                ? "border-navy text-navy font-bold"
                : "text-ink hover:border-line hover:text-navy border-transparent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
