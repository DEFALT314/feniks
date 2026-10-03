import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

// Centered card used by the login, sign-up and password screens (design/makiety/Logowanie.dc.html)
export function AuthCard({
  title,
  headingId,
  children,
  footer,
  aside,
}: {
  title: string;
  headingId: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode; // shown next to the card, e.g. demo accounts in demo mode
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start justify-center gap-8 px-4 pt-14 pb-[72px] sm:px-10"
    >
      <Card
        role="region"
        aria-labelledby={headingId}
        className="flex w-full max-w-[480px] flex-col gap-[22px] p-8 sm:p-10"
      >
        <h1 id={headingId} className="font-heading text-[2.125rem] font-bold tracking-tight">
          {title}
        </h1>
        {children}
        {footer ? <p className="border-border border-t pt-5 text-center">{footer}</p> : null}
      </Card>
      {aside}
    </main>
  );
}
