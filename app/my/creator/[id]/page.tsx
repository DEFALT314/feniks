import type { Metadata } from "next";
import { Wizard } from "../_components/wizard";

export const metadata: Metadata = {
  title: "Kanwa innowacji – HubMI.pl",
};

export default async function CanvasPage({ params, searchParams }: PageProps<"/my/creator/[id]">) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  return <Wizard ideaId={id} stepId={typeof step === "string" ? step : undefined} />;
}
