import type { ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { Logo } from "./logo";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";
import {
  accountItemsFor,
  navItemsFor,
  notificationsBadge,
  notificationsLabel,
  withoutDuplicates,
  type CurrentUser,
} from "./navigation";
import { SiteNav } from "./site-nav";
import { TextSizeToggle } from "./text-size-toggle";

type SiteHeaderProps = {
  user: CurrentUser | null;
  unreadNotifications?: number;
  demoMode?: boolean;
  a11yPlus?: boolean; // A+ state from the cookie, so the toggle renders pressed on the server
  bell?: ReactNode; // live notification bell (P4, #7); falls back to a plain link
};

// Header per design/makiety/Naglowek.dc.html. From 1024 px: logo, one-row menu, A+, bell and the
// account menu. Below that (and at 200% zoom): logo, A+, bell and a "Menu" button (#75). At 320 px
// with A+ the controls wrap under the logo instead of pushing "Menu" off-screen (WCAG 1.4.10).
export function SiteHeader({
  user,
  unreadNotifications = 0,
  demoMode = false,
  a11yPlus = false,
  bell,
}: SiteHeaderProps) {
  const role = user?.role ?? null;
  const items = navItemsFor(role);
  const accountItems = accountItemsFor(role);
  return (
    <header className="border-border relative border-b bg-white">
      {demoMode ? (
        <div className="bg-warning-soft text-warning text-[0.9375rem]">
          <p className="mx-auto max-w-[1200px] px-4 py-1.5 sm:px-10">
            Wersja pokazowa, dane osób są fikcyjne.{" "}
            <Link href="/login" className="text-warning hover:text-warning font-bold">
              Zmień konto
            </Link>
          </p>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-[76px] max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:gap-x-6 sm:px-10 lg:gap-x-5 lg:px-8 xl:gap-x-6 xl:px-10">
        <Link
          href="/"
          aria-label="HubMI – strona główna"
          className="text-ink hover:text-ink min-w-0 py-2.5 no-underline"
        >
          {/* The tagline explains HubMI to first-time visitors; signed-in users get the room for
              their main task in the menu instead, so it stays one row at 1280 px (#75) */}
          <Logo taglineClassName={user ? "hidden 2xl:block" : "hidden xl:block"} />
        </Link>
        {/* With A+ the one-row menu needs a wider screen; below that the "Menu" button takes over */}
        <SiteNav items={items} className="a11y-plus:max-2xl:hidden hidden min-w-0 lg:flex" />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 pb-2 sm:gap-2.5 sm:pb-0">
          <TextSizeToggle initialOn={a11yPlus} />
          {user ? (
            <>
              {bell ?? (
                <Link
                  href="/my/messages"
                  aria-label={notificationsLabel(unreadNotifications)}
                  className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
                >
                  <Bell aria-hidden="true" />
                  {unreadNotifications > 0 ? (
                    <span
                      aria-hidden="true"
                      className="bg-brick absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white tabular-nums"
                    >
                      {notificationsBadge(unreadNotifications)}
                    </span>
                  ) : null}
                </Link>
              )}
              <AccountMenu
                user={user}
                items={accountItems}
                className="a11y-plus:max-2xl:hidden hidden lg:block"
              />
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Zaloguj się
            </Link>
          )}
          <MobileMenu
            user={user}
            items={items}
            accountItems={withoutDuplicates(accountItems, items)}
            className="a11y-plus:max-2xl:block lg:hidden"
          />
        </div>
      </div>
    </header>
  );
}
