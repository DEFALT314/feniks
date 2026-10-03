"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, roleLabel, type CurrentUser, type NavItem } from "./navigation";
import { dropdownClass, useDisclosure } from "./use-disclosure";

const itemClass =
  "flex min-h-11 w-full items-center rounded-lg px-3 transition-colors text-left text-base text-ink no-underline hover:bg-navy-soft hover:text-ink";

// "Imię ▾" on wide screens: personal pages, profile and sign-out (disclosure, not an ARIA menu,
// so it works with Tab like any list of links).
export function AccountMenu({
  user,
  items,
  className,
}: {
  user: CurrentUser;
  items: NavItem[];
  className?: string;
}) {
  const { open, state, toggle, wrapperRef, buttonRef } = useDisclosure<
    HTMLDivElement,
    HTMLButtonElement
  >();
  const panelId = useId();
  const pathname = usePathname();

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="text-ink hover:bg-navy-soft aria-expanded:bg-navy-soft flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 text-left leading-tight transition-colors"
      >
        {/* 1024–1279 px: initial only, so the menu stays in one row; name and role from 1280 px */}
        <span
          aria-hidden="true"
          className="bg-navy flex size-9 items-center justify-center rounded-full text-base font-bold text-white xl:hidden"
        >
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="sr-only xl:not-sr-only xl:flex xl:flex-col">
          <strong className="max-w-[14ch] truncate text-base">{user.name}</strong>
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {roleLabel(user.role)}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform duration-(--duration-fast) motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
        <span className="sr-only">: menu konta</span>
      </button>
      <div
        id={panelId}
        hidden={state === "closed"}
        inert={state === "closing"}
        data-origin="top-right"
        className={cn(
          dropdownClass(state),
          "border-border absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-2 shadow-[0_16px_40px_-16px_rgba(21,26,35,0.35)]",
        )}
      >
        <p className="border-border mb-2 border-b px-3 pt-1 pb-2.5 leading-tight">
          <strong className="block">{user.name}</strong>
          <span className="text-muted-foreground text-sm">{roleLabel(user.role)}</span>
        </p>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className={cn(
                  itemClass,
                  "aria-[current=page]:text-navy aria-[current=page]:font-bold",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/auth/sign-out" method="post" className="border-border mt-2 border-t pt-2">
          <button type="submit" className={cn(itemClass, "cursor-pointer font-bold")}>
            Wyloguj się
          </button>
        </form>
      </div>
    </div>
  );
}
