"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "./navigation";

// Main menu on wide screens: one row, no wrapping (#75). Narrow screens use MobileMenu.
export function SiteNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu główne"
      className={cn("flex flex-nowrap gap-x-4 self-stretch", className)}
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center border-b-[3px] text-[1.0625rem] whitespace-nowrap no-underline transition-colors duration-200",
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
