import type { Metadata } from "next";
import { IdeaCard } from "../../_components/card-form";

export const metadata: Metadata = {
  title: "Fiszka pomysłu – HubMI.pl",
};

export default async function CardPage({ params }: PageProps<"/my/creator/[id]/card">) {
  const { id } = await params;
  return <IdeaCard ideaId={id} />;
}
