import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HubMI.pl – Małopolski Hub Innowacji Społecznych",
  description:
    "Innowacje społeczne w Małopolsce: dopasowanie rozwiązań, biblioteka, kreator pomysłów.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
