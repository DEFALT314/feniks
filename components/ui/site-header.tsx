import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { Logo } from "./logo";
import { navItemsFor, notificationsLabel, roleLabel, type CurrentUser } from "./navigation";
import { SiteNav } from "./site-nav";
import { TextSizeToggle } from "./text-size-toggle";

type SiteHeaderProps = {
  user: CurrentUser | null;
  unreadNotifications?: number;
  demoMode?: boolean;
};

// Header per design/makiety/Naglowek.dc.html
export function SiteHeader({ user, unreadNotifications = 0, demoMode = false }: SiteHeaderProps) {
  return (
    <header className="border-border border-b bg-white">
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
      <div className="mx-auto flex min-h-[76px] max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-2 px-4 sm:px-10">
        <Link
          href="/"
          aria-label="HubMI – strona główna"
          className="text-ink hover:text-ink py-2.5 no-underline"
        >
          <Logo />
        </Link>
        <SiteNav items={navItemsFor(user?.role ?? null)} />
        <div className="flex items-center gap-2.5">
          <TextSizeToggle />
          {user ? (
            <>
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
              <p className="flex flex-col pl-1.5 leading-tight">
                <strong className="text-base">{user.name}</strong>
                <span className="text-muted-foreground text-sm">{roleLabel(user.role)}</span>
              </p>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Zaloguj się
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
