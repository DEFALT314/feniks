import type { Metadata } from "next";
import { MyIdeas } from "./_components/my-ideas";

export const metadata: Metadata = {
  title: "Moje pomysły – HubMI.pl",
  description: "Kreator pomysłów: kanwa innowacji krok po kroku i fiszka pomysłu dla ROPS.",
};

export default function CreatorPage() {
  return <MyIdeas />;
}
