import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { Announcer } from "@/components/ui/announcer";
import { RouteFocus, SkipLink } from "@/components/ui/route-focus";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { Motion } from "@/components/ui/motion";
import { MOTION_WAIT_SCRIPT } from "@/components/ui/motion-core";
import { A11Y_PLUS_COOKIE, A11Y_PLUS_SCRIPT, a11yPlusFromCookie } from "@/components/ui/a11y-plus";
import { LazyNotificationBell } from "@/components/notifications/lazy-notification-bell";
import { getCurrentUser, headerName } from "@/lib/auth";
import { unreadCount } from "@/lib/notification-feed";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

// Body text: designed for low-vision readers (design/makiety/System.dc.html).
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-atkinson",
});

// Headings.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "HubMI.pl – Małopolski Hub Innowacji Społecznych",
  description:
    "Innowacje społeczne w Małopolsce: dopasowanie rozwiązań, biblioteka, kreator pomysłów.",
};

// Every page renders its own <main id="main-content">, the target of the skip link.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const current = await getCurrentUser();
  const user = current ? { name: headerName(current), role: current.role } : null;
  const unread = current ? await unreadCount(await createClient()) : 0;
  const a11yPlus = a11yPlusFromCookie((await cookies()).get(A11Y_PLUS_COOKIE)?.value);
  return (
    <html
      lang="pl"
      data-a11y-plus={a11yPlus ? "" : undefined}
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_PLUS_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: MOTION_WAIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <SiteHeader
          user={user}
          unreadNotifications={unread}
          demoMode={process.env.DEMO_MODE === "true"}
          a11yPlus={a11yPlus}
          bell={
            current ? (
              <LazyNotificationBell userId={current.id} initialUnread={unread} />
            ) : undefined
          }
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Announcer />
        <RouteFocus />
        <Motion />
      </body>
    </html>
  );
}
