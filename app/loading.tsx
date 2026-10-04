import { PageSkeleton } from "@/components/ui/skeleton";

// Shown at once after a click while the next page loads its data (every page reads the database
// on each visit). The header and footer stay; pages with their own loading.tsx override this one.
export default function Loading() {
  return <PageSkeleton label="Wczytywanie strony…" />;
}
