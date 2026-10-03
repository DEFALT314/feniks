import { PageSkeleton } from "@/components/ui/skeleton";

// Same layout as the tester: tests on the left, the rating panel on the right
export default function Loading() {
  return <PageSkeleton label="Wczytywanie testów…" layout="split" cards={2} />;
}
