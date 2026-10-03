"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "./navigation";

// Moves the underline under the active link; without `animate` it jumps there (first paint).
// `data-ready` on the nav hands the underline over from the link's own border to the bar.
function placeBar(nav: HTMLElement, bar: HTMLElement, animate: boolean) {
  const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (!animate) bar.style.transition = "none";
  bar.style.opacity = link ? "1" : "0";
  if (link) {
    bar.style.transform = `translateX(${link.offsetLeft}px)`;
    bar.style.width = `${link.offsetWidth}px`;
  }
  if (!animate) {
    void bar.offsetWidth; // apply the position before the transition comes back
    bar.style.transition = "";
  }
  nav.dataset.ready = "";
}

// Main menu on wide screens: one row, no wrapping (#75). Narrow screens use MobileMenu.
// The active-page underline slides between links (`.t-tabs-bar` in globals.css). Until the script
// has measured it (and without JS) the active link draws its own border instead.
export function SiteNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !barRef.current) return;
    placeBar(nav, barRef.current, "ready" in nav.dataset);
  }, [pathname, items]);

  // Widths change with the window, the A+ text size and the bold active link; the bar follows
  useEffect(() => {
    const nav = navRef.current;
    const bar = barRef.current;
    if (!nav || !bar) return;
    const observer = new ResizeObserver(() => placeBar(nav, bar, "ready" in nav.dataset));
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Menu główne"
      className={cn("group relative flex flex-nowrap gap-x-4 self-stretch", className)}
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center border-b-[3px] text-[1.0625rem] whitespace-nowrap no-underline transition-colors",
              active
                ? "border-navy text-navy font-bold group-data-ready:border-transparent"
                : "text-ink hover:border-line hover:text-navy border-transparent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <span ref={barRef} aria-hidden="true" className="t-tabs-bar" />
    </nav>
  );
}
