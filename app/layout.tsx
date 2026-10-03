import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { A11Y_PLUS_SCRIPT } from "@/components/ui/text-size-toggle";
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
export default function RootLayout({ children }: LayoutProps<"/">) {
  // TODO(P4): pass getCurrentUser() from lib/auth and the unread notification count once they exist
  const user = null;
  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_PLUS_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-[10px] bg-white px-4 py-3 font-bold focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Przejdź do treści
        </a>
        <SiteHeader user={user} demoMode={process.env.DEMO_MODE === "true"} />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
