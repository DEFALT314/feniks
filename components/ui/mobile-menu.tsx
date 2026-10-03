"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, roleLabel, type CurrentUser, type NavItem } from "./navigation";
import { dropdownClass, useDisclosure } from "./use-disclosure";

const linkClass =
  "flex min-h-12 items-center rounded-lg px-3 transition-colors text-[1.0625rem] text-ink no-underline hover:bg-navy-soft hover:text-ink aria-[current=page]:font-bold aria-[current=page]:text-navy";

function Links({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            className={linkClass}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Narrow screens and 200% zoom (WCAG 1.4.10): one "Menu" button instead of wrapped rows (#75).
// The panel opens under the header, in the page flow order, and closes with Escape.
export function MobileMenu({
  user,
  items,
  accountItems,
  className,
}: {
  user: CurrentUser | null;
  items: NavItem[];
  accountItems: NavItem[];
  className?: string;
}) {
  const { open, state, toggle, wrapperRef, buttonRef } = useDisclosure<
    HTMLDivElement,
    HTMLButtonElement
  >();
  const panelId = useId();
  const pathname = usePathname();
  const Icon = open ? X : Menu;
  // The icon swap animates only after the first toggle, not on page load
  const [swapped, setSwapped] = useState(false);

  return (
    <div ref={wrapperRef} className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setSwapped(true);
          toggle();
        }}
        className="border-input text-ink hover:border-navy aria-expanded:border-navy aria-expanded:bg-navy flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border bg-white px-2.5 text-base font-bold transition-colors aria-expanded:text-white"
      >
        <Icon
          key={open ? "close" : "menu"}
          aria-hidden="true"
          className={cn("size-5", swapped && "t-icon-in")}
        />
        Menu
      </button>
      <div
        id={panelId}
        hidden={state === "closed"}
        inert={state === "closing"}
        data-origin="top-center"
        className={cn(
          dropdownClass(state),
          "border-border absolute inset-x-0 top-full z-50 border-b bg-white shadow-[0_16px_40px_-16px_rgba(21,26,35,0.35)]",
        )}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:px-10">
          <nav aria-label="Menu główne">
            <Links items={items} pathname={pathname} />
          </nav>
          <div className="border-border flex flex-col gap-1 border-t pt-3">
            {user ? (
              <>
                <p className="px-3 leading-tight">
                  <strong>{user.name}</strong>{" "}
                  <span className="text-muted-foreground text-sm">({roleLabel(user.role)})</span>
                </p>
                <Links items={accountItems} pathname={pathname} />
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className={cn(linkClass, "w-full cursor-pointer font-bold")}
                  >
                    Wyloguj się
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className={cn(linkClass, "font-bold")}>
                  Zaloguj się
                </Link>
                <Link href="/register" className={linkClass}>
                  Załóż konto
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
