import type { ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { Logo } from "./logo";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";
import { accountItemsFor, navItemsFor, notificationsLabel, type CurrentUser } from "./navigation";
import { SiteNav } from "./site-nav";
import { TextSizeToggle } from "./text-size-toggle";

type SiteHeaderProps = {
  user: CurrentUser | null;
  unreadNotifications?: number;
  demoMode?: boolean;
  bell?: ReactNode; // live notification bell (P4, #7); falls back to a plain link
};

// Header per design/makiety/Naglowek.dc.html. From 1024 px: logo, one-row menu, A+, bell and the
// account menu. Below that (and at 200% zoom): logo, A+, bell and a "Menu" button (#75).
export function SiteHeader({
  user,
  unreadNotifications = 0,
  demoMode = false,
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
      <div className="mx-auto flex min-h-[76px] max-w-[1200px] items-center gap-x-3 px-4 sm:gap-x-6 sm:px-10 lg:gap-x-5 lg:px-8 xl:gap-x-6 xl:px-10">
        <Link
          href="/"
          aria-label="HubMI – strona główna"
          className="text-ink hover:text-ink shrink-0 py-2.5 no-underline"
        >
          <Logo taglineClassName="hidden xl:block" />
        </Link>
        <SiteNav items={items} className="hidden min-w-0 lg:flex" />
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <TextSizeToggle />
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
                      className="bg-brick absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                    >
                      {unreadNotifications}
                    </span>
                  ) : null}
                </Link>
              )}
              <AccountMenu user={user} items={accountItems} className="hidden lg:block" />
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
          <MobileMenu user={user} items={items} accountItems={accountItems} className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
